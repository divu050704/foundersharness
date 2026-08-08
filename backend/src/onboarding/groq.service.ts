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
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private apiKey: string | null = null;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly modelName = 'llama-3.3-70b-versatile';

  constructor() {
    this.loadEnv();
  }

  private loadEnv() {
    if (process.env.GROQ_API_KEY) {
      this.apiKey = process.env.GROQ_API_KEY;
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
            if (key === 'GROQ_API_KEY') {
              this.apiKey = val.trim();
              process.env.GROQ_API_KEY = this.apiKey;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn('Failed to load GROQ_API_KEY from local .env file', e);
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
      this.logger.error('GROQ_API_KEY is not configured.');
      throw new Error('GROQ_API_KEY is missing. Please add it to your backend .env file.');
    }

    try {
      const payload: any = {
        model: this.modelName,
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
      console.log(systemPrompt, userPrompt, responseFormat)


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
        this.logger.error(`Groq API request failed: Status ${response.status} - ${errText}`);
        throw new Error(`Groq API response error: ${response.statusText} (${response.status})`);
      }

      const data = (await response.json()) as any;
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content || '';
      }

      throw new Error('Malformed completion response structure from Groq API.');
    } catch (error) {
      this.logger.error('Error contacting Groq Inference API', error);
      throw error;
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

    for (let step = 1; step <= maxSteps; step++) {
      const state = await getState();
      const userPrompt = buildUserPrompt(step, maxSteps, state, executionFeedback);
      executionFeedback = null;

      this.logger.log(`[${label}] Step ${step}/${maxSteps}: requesting next action...`);
      const responseText = await this.generateCompletion(systemPrompt, userPrompt, responseFormat);
      
      let cleanedResponse = responseText.trim();
      const mdMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (mdMatch) {
        cleanedResponse = mdMatch[1].trim();
      }
      
      const agentAction = JSON.parse(cleanedResponse);

      this.logger.log(`[${label}] Step ${step}: thought=${agentAction.thought || 'None'} action=${agentAction.action}`);

      if (agentAction.action === 'finish') {
        if (handleFinish) {
          const verdict = await handleFinish(agentAction, step, maxSteps);
          if (!verdict.accept) {
            executionFeedback = verdict.feedback || "Action outputted 'finish' but was not accepted. Retrying...";
            continue;
          }
        }
        return agentAction;
      }

      try {
        const execResult = await executeAction(agentAction);
        executionFeedback = execResult.feedback || 'Action executed successfully.';
      } catch (execErr) {
        this.logger.error(`[${label}] Action execution failed: ${execErr.message}`);
        executionFeedback = `Action execution failed: ${execErr.message}. If the element was not found, check the active URL or try a different approach.`;
      }
    }

    throw new Error(`Agent loop [${label}] exceeded max steps (${maxSteps}) without a finish action.`);
  }
}