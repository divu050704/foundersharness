import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentActionResult {
  feedback?: string;
}

export interface AgentFinishVerdict {
  accept: boolean;
  feedback?: string;
}

export interface AgentLoopOptions {
  /** System prompt sent to the model for every step of this loop. */
  systemPrompt: string;
  /** Builds the user-turn prompt for a given step from the latest state + feedback. */
  buildUserPrompt: (step: number, maxSteps: number, state: any, feedback: string | null) => string;
  /** Fetches whatever "world state" (e.g. browser state) should be shown to the model each step. */
  getState: () => Promise<any>;
  /** Executes a non-"finish" action returned by the model. Throw to signal failure (fed back as feedback). */
  executeAction: (action: any) => Promise<AgentActionResult>;
  /**
   * Optional gate on "finish" actions - e.g. to reject low-confidence finishes and retry.
   * If omitted, any "finish" action is accepted immediately.
   */
  handleFinish?: (action: any, step: number, maxSteps: number) => Promise<AgentFinishVerdict>;
  maxSteps?: number;
  responseFormat?: { type: 'json_object' };
  /** Optional label used in log lines to distinguish concurrent/different agent loops. */
  label?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private apiKey: string | null = null;
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  private readonly modelName = 'gemini-3.1-flash-lite';

  constructor() {
    this.loadEnv();
  }

  private loadEnv() {
    if (process.env.GEMINI_API_KEY) {
      this.apiKey = process.env.GEMINI_API_KEY;
      return;
    }

    try {
      const cwdPath = path.resolve(process.cwd(), '.env');
      const backendCwdPath = path.resolve(process.cwd(), 'backend/.env');
      const dirnamePath = path.resolve(__dirname, '../../../.env');

      let envPath = '';
      if (fs.existsSync(cwdPath)) {
        envPath = cwdPath;
      } else if (fs.existsSync(backendCwdPath)) {
        envPath = backendCwdPath;
      } else if (fs.existsSync(dirnamePath)) {
        envPath = dirnamePath;
      }

      if (envPath && fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        for (const line of envConfig.split('\n')) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let val = match[2] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1);
            }
            if (key === 'GEMINI_API_KEY') {
              this.apiKey = val.trim();
              process.env.GEMINI_API_KEY = this.apiKey;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn('Failed to load GEMINI_API_KEY from local .env file', e);
    }
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    responseFormat?: { type: 'json_object' },
  ): Promise<string> {
    if (!this.apiKey) {
      this.loadEnv();
    }

    if (!this.apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured.');
      throw new Error('GEMINI_API_KEY is missing. Please add it to your backend .env file.');
    }

    const models = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemma-4-26b',
      'gemma-4-31b',
    ];

    let lastError: any = null;

    for (const model of models) {
      try {
        this.logger.log(`Attempting completion with model: ${model}`);
        const payload: any = {
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 8192,
        };

        if (responseFormat) {
          payload.response_format = responseFormat;
        }

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API request failed: Status ${response.status} - ${errText}`);
        }

        const data = (await response.json()) as any;
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          this.logger.log(`Successfully generated completion using model: ${model}`);
          return data.choices[0].message.content || '';
        }

        throw new Error('Malformed completion response structure.');
      } catch (error) {
        this.logger.warn(`Error generating completion with model ${model}: ${error.message}`);
        lastError = error;
      }
    }

    this.logger.error('All Gemini and fallback models failed to generate completion.');
    throw lastError || new Error('All models failed.');
  }

  private accumulateActionData(target: any, source: any) {
    const skipKeys = ['action', 'thought', 'selector', 'url', 'text', 'ms', 'confidence', 'reasoning'];
    for (const key of Object.keys(source)) {
      if (skipKeys.includes(key)) continue;
      const value = source[key];
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        if (!Array.isArray(target[key])) {
          target[key] = [];
        }
        for (const item of value) {
          const strItem = typeof item === 'object' ? JSON.stringify(item) : String(item);
          const exists = target[key].some((el: any) => 
            (typeof el === 'object' ? JSON.stringify(el) : String(el)) === strItem
          );
          if (!exists) {
            target[key].push(item);
          }
        }
      } else if (typeof value === 'object') {
        if (typeof target[key] !== 'object' || target[key] === null) {
          target[key] = {};
        }
        this.accumulateActionData(target[key], value);
      } else {
        if (target[key] === undefined || target[key] === null || String(value).trim().length > 0) {
          target[key] = value;
        }
      }
    }
  }

  /**
   * Generic ReAct-style agent loop: fetch state → ask the model for a JSON action →
   * either execute the action and feed back the result, or return once "finish" is accepted.
   *
   * Every caller (session verification, posting, scraping, etc.) plugs in its own
   * system prompt, state source, and action executor, so all agent-loop logic
   * (retry semantics, logging, error boundaries) lives in one place.
   */
  async runAgentLoop(options: AgentLoopOptions): Promise<any> {
    const {
      systemPrompt,
      buildUserPrompt,
      getState,
      executeAction,
      handleFinish,
      maxSteps = 2,
      responseFormat = { type: 'json_object' },
      label = 'agent-loop',
    } = options;

    let executionFeedback: string | null = null;
    const visitedUrls: string[] = [];
    const clickedSelectors: string[] = [];
    const accumulatedData: any = {};

    for (let step = 1; step <= maxSteps; step++) {
      const state = await getState();
      if (state && typeof state.url === 'string') {
        const currentUrl = state.url.trim();
        if (currentUrl && !visitedUrls.includes(currentUrl)) {
          visitedUrls.push(currentUrl);
        }
      }

      let userPrompt = buildUserPrompt(step, maxSteps, state, executionFeedback);
      executionFeedback = null;

      // Inject guidelines about visited URL stack, clicked selectors, and progressive data accumulation
      userPrompt += `\n\n[Navigation & Scraping Guidelines]:
- Visited URLs in this loop: ${visitedUrls.length > 0 ? visitedUrls.join(', ') : 'None'}. Do NOT navigate to the same URL again.
- Clicked Selectors/Links: ${clickedSelectors.length > 0 ? clickedSelectors.join(', ') : 'None'}. DO NOT click these selectors or links again. You must choose a DIFFERENT post selector or element to scrape other posts.
- Progressive Data Saving: You can save extracted data progressively! Include data fields (e.g. "posts": ["..."], "bio": "...") in ANY action (even navigate, click, or wait). The system accumulates them automatically.
- Data Saved So Far: ${JSON.stringify(accumulatedData)}. You do not need to re-extract or re-send these items.`;

      this.logger.log(`[${label}] Step ${step}/${maxSteps}: requesting next action...`);
      const responseText = await this.generateCompletion(systemPrompt, userPrompt, responseFormat);
      const agentAction = JSON.parse(responseText);

      // Accumulate any data returned in this step
      this.accumulateActionData(accumulatedData, agentAction);

      this.logger.log(`[${label}] Step ${step}: thought=${agentAction.thought || 'None'} action=${agentAction.action}`);

      if (agentAction.action === 'finish') {
        if (handleFinish) {
          const verdict = await handleFinish(agentAction, step, maxSteps);
          if (!verdict.accept) {
            executionFeedback = verdict.feedback || "Action outputted 'finish' but was not accepted. Retrying...";
            continue;
          }
        }
        return { ...agentAction, ...accumulatedData };
      }

      try {
        const execResult = await executeAction(agentAction);
        executionFeedback = execResult.feedback || 'Action executed successfully.';
        if (agentAction.action === 'click' && typeof agentAction.selector === 'string') {
          const sel = agentAction.selector.trim();
          if (sel && !clickedSelectors.includes(sel)) {
            clickedSelectors.push(sel);
          }
        }
      } catch (execErr) {
        this.logger.error(`[${label}] Action execution failed: ${execErr.message}`);
        executionFeedback = `Action execution failed: ${execErr.message}. If the element was not found, check the active URL or try a different approach.`;
      }
    }

    if (Object.keys(accumulatedData).length > 0) {
      this.logger.log(`[${label}] Loop ended without finish action, but returning accumulated data: ${JSON.stringify(accumulatedData)}`);
      return { action: 'finish', ...accumulatedData };
    }

    throw new Error(`Agent loop [${label}] exceeded max steps (${maxSteps}) without a finish action and no accumulated data.`);
  }
}
