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
    systemPromptOrMessages: string | any[],
    userPrompt?: string | any,
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
          messages: Array.isArray(systemPromptOrMessages)
            ? systemPromptOrMessages
            : [
                { role: 'system', content: systemPromptOrMessages },
                { role: 'user', content: userPrompt },
              ],
          temperature: 0.2,
          max_tokens: 8192,
        };
        console.log(payload)

        const actualFormat = Array.isArray(systemPromptOrMessages)
          ? (userPrompt as { type: 'json_object' })
          : responseFormat;

        if (actualFormat) {
          payload.response_format = actualFormat;
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
    const messages: any[] = [];

    for (let step = 1; step <= maxSteps; step++) {
      const state = await getState();
      if (state && typeof state.url === 'string') {
        const currentUrl = state.url.trim();
        if (currentUrl && !visitedUrls.includes(currentUrl)) {
          visitedUrls.push(currentUrl);
        }
      }

      let userContent = '';
      if (step === 1) {
        userContent += `[SYSTEM INSTRUCTIONS]:\n${systemPrompt}\n\n`;
      }
      userContent += buildUserPrompt(step, maxSteps, state, executionFeedback);
      executionFeedback = null;

      // Extract post IDs and determine the active step in the pipeline
      const openedPostIds: string[] = [];
      for (const url of visitedUrls) {
        const match = url.match(/\/p\/([a-zA-Z0-9_-]+)/);
        if (match && !openedPostIds.includes(match[1])) {
          openedPostIds.push(match[1]);
        }
      }

      const postCount = Array.isArray(accumulatedData.posts) ? accumulatedData.posts.length : 0;
      const hasBio = typeof accumulatedData.bio === 'string' && accumulatedData.bio.trim().length > 0;

      let currentPipelineStep = 'Executing sequential scraping logic...';
      if (label?.includes('instagram')) {
        const hasInstagramProfileVisited = visitedUrls.some(u => {
          const path = u.replace('https://www.instagram.com', '').replace('https://instagram.com', '');
          return path.length > 1 && !path.startsWith('/p/') && !path.startsWith('/direct/') && !path.startsWith('/reels/') && !path.startsWith('/explore/');
        });

        if (!hasInstagramProfileVisited) {
          currentPipelineStep = 'step1_navigate_to_profile()  # Target: Navigate to user profile page';
        } else if (!hasBio) {
          currentPipelineStep = 'step2_scrape_bio()           # Target: Extract and save the user bio';
        } else if (postCount < 5) {
          currentPipelineStep = `step3_scrape_posts_sequentially()  # Target: Click and scrape Post #${postCount + 1} (already saved ${postCount} posts)`;
        } else {
          currentPipelineStep = 'step4_finish()               # Target: Scraped 5 posts successfully, call finish';
        }
      } else if (label?.includes('linkedin')) {
        const isOnLinkedInActivity = visitedUrls.some(u => u.includes('/recent-activity/'));
        if (!isOnLinkedInActivity) {
          currentPipelineStep = 'step1_navigate_to_recent_activity()  # Target: Navigate to recent activity page';
        } else if (postCount < 5) {
          currentPipelineStep = `step3_extract_posts()  # Target: Scrape Post #${postCount + 1}`;
        } else {
          currentPipelineStep = 'step4_finish()        # Target: Scraped all posts, call finish';
        }
      }

      // Inject guidelines about visited URL stack, clicked selectors, and progressive data accumulation
      userContent += `\n\n# --- SCRAPING CHECKPOINT SYSTEM STATE (Python Variables) ---
# Current active pipeline step to execute:
>>> ${currentPipelineStep}

# State Variables:
CLICKED_SELECTORS_OR_LINKS = ${JSON.stringify(clickedSelectors)}
VISITED_URLS = ${JSON.stringify(visitedUrls)}
ALREADY_OPENED_POST_IDS = ${JSON.stringify(openedPostIds)}
DATA_SAVED_SO_FAR = ${JSON.stringify(accumulatedData)}

# Guidelines:
# - Compare your current position and targets with ALREADY_OPENED_POST_IDS.
# - Do NOT click any post selectors or links containing a post ID that is in ALREADY_OPENED_POST_IDS (e.g. if 'DP_imdqkyCI' is in the list, avoid clicking selectors like 'a[href*="DP_imdqkyCI"]').
# - You must choose a post link representing a DIFFERENT post ID to scrape other posts.
# - You can save extracted data progressively! Include data fields (e.g., "posts": ["..."], "bio": "...") in ANY action (navigate, click, wait). The system automatically merges them into DATA_SAVED_SO_FAR.`;

      messages.push({ role: 'user', content: userContent });

      this.logger.log(`[${label}] Step ${step}/${maxSteps}: requesting next action...`);
      const responseText = await this.generateCompletion(messages, responseFormat);
      
      let cleanedResponse = responseText.trim();
      const mdMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (mdMatch) {
        cleanedResponse = mdMatch[1].trim();
      }
      
      const agentAction = JSON.parse(cleanedResponse);

      // Save the LLM's response as system role as requested
      messages.push({ role: 'system', content: responseText });

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
