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
  buildUserPrompt: (attempt: number, maxAttempts: number, state: any, feedback: string | null) => string;
  /** Fetches whatever "world state" (e.g. browser state) should be shown to the model each step. */
  getState: () => Promise<any>;
  /** Executes a non-"finish" action returned by the model. Throw to signal failure (fed back as feedback). */
  executeAction: (action: any) => Promise<AgentActionResult>;
  /**
   * Optional gate on "finish" actions - e.g. to reject low-confidence finishes and retry.
   * If omitted, any "finish" action is accepted immediately.
   */
  handleFinish?: (action: any, attempt: number, maxAttempts: number) => Promise<AgentFinishVerdict>;
  maxAttempts?: number;
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
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return;
    }
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
      maxAttempts = 2,
      responseFormat = { type: 'json_object' },
      label = 'agent-loop',
    } = options;

    let executionFeedback: string | null = null;
    const visitedUrls: string[] = [];
    const clickedSelectors: string[] = [];
    const accumulatedData: any = {};
    const messages: any[] = [];
    const stateSignatures: string[] = [];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const state = await getState();
      if (state && typeof state.url === 'string') {
        const currentUrl = state.url.trim();
        if (currentUrl && !visitedUrls.includes(currentUrl)) {
          visitedUrls.push(currentUrl);
        }
      }

      // Track rolling signature of the state + last feedback
      const currentSignature = `${state?.url || ''}::${executionFeedback || ''}`;
      let repeatCount = 0;
      for (let i = stateSignatures.length - 1; i >= 0; i--) {
        if (stateSignatures[i] === currentSignature) {
          repeatCount++;
        } else {
          break;
        }
      }
      stateSignatures.push(currentSignature);
      if (stateSignatures.length > 5) {
        stateSignatures.shift();
      }

      if (repeatCount >= 3) {
        this.logger.error(`[${label}] Aborting agent loop early: stuck in loop on state signature: ${currentSignature}`);
        throw new Error(`Agent loop aborted early: loop detected. Last action feedback: "${executionFeedback}". URL: ${state?.url}`);
      } else if (repeatCount >= 1) {
        this.logger.warn(`[${label}] Loop/stuck state detected. Repeat count: ${repeatCount}. Escalating feedback directive.`);
        const baseFeedback = executionFeedback || 'No feedback';
        executionFeedback = `STUCK STATE DETECTED! Your last ${repeatCount + 1} attempts made no progress on the same page state (URL and elements did not change, or you received the same feedback). 
Problem: ${baseFeedback}
Directive: You must change your approach. If you returned an invalid array, return a single valid action object now. If you clicked something that did not load, try a different selector or action.`;
      }

      // Extract post IDs and determine the active attempt in the pipeline
      const openedPostIds: string[] = [];
      for (const url of visitedUrls) {
        const match = url.match(/\/p\/([a-zA-Z0-9_-]+)/);
        if (match && !openedPostIds.includes(match[1])) {
          openedPostIds.push(match[1]);
        }
      }

      const postCount = Array.isArray(accumulatedData.posts) ? accumulatedData.posts.length : 0;
      const hasBio = typeof accumulatedData.bio === 'string' && accumulatedData.bio.trim().length > 0;

      let currentPipelineStep = {
        stage: 'execute_task',
        instruction: 'Execute the browser automation task step by step.'
      };

      if (label?.includes('instagram')) {
        if (label?.includes('scrape-posts')) {
          const hasInstagramProfileVisited = visitedUrls.some(u => {
            const path = u.replace('https://www.instagram.com', '').replace('https://instagram.com', '');
            return path.length > 1 && !path.startsWith('/p/') && !path.startsWith('/direct/') && !path.startsWith('/reels/') && !path.startsWith('/explore/');
          });

          if (!hasInstagramProfileVisited) {
            currentPipelineStep = {
              stage: 'step1_navigate_to_profile',
              instruction: 'Start from the Instagram home page, locate the link/avatar for the user\'s own profile (usually the "Profile" nav item or the account avatar linking to "/<username>/"), then click or navigate to it.'
            };
          } else if (!hasBio) {
            currentPipelineStep = {
              stage: 'step2_scrape_bio',
              instruction: 'Now on the profile page, first extract the user\'s bio text near the top of the profile page. Save this bio in the "bio" field of your action JSON. DO NOT call "finish" yet. Proceed to scrape posts.'
            };
          } else if (postCount < 5) {
            currentPipelineStep = {
              stage: 'step3_scrape_posts_sequentially',
              instruction: `Currently saved ${postCount} posts. Target: Click and scrape Post #${postCount + 1}. Remember:
1. You MUST be on the profile page (URL ends with '/<username>/') to click a post.
2. Click a post whose ID isn't in ALREADY_OPENED_POST_IDS (e.g. if 'DP_imdqkyCI' is in the list, avoid clicking selectors like 'a[href*="DP_imdqkyCI"]').
3. Once the post opens, read the caption and save/append it to "posts" array in the action JSON.
4. You MUST close the post or navigate back to the profile page before attempting to click the next post. Do not click another post from details view.`
            };
          } else {
            currentPipelineStep = {
              stage: 'step4_finish',
              instruction: `Scraped ${postCount} posts successfully (at least 5 required). Call the "finish" action with the accumulated "posts" and "bio".`
            };
          }
        } else if (label?.includes('verify-session')) {
          currentPipelineStep = {
            stage: 'verify_instagram_session',
            instruction: 'Analyze the URL and accessibility tree to check if logged in. Look for "Messages" or profile links. If logged out, identify login inputs. Return "finish" with connected: true/false.'
          };
        }
      } else if (label?.includes('linkedin')) {
        if (label?.includes('scrape-posts')) {
          const isOnLinkedInActivity = visitedUrls.some(u => u.includes('/recent-activity/'));
          if (!isOnLinkedInActivity) {
            currentPipelineStep = {
              stage: 'step1_navigate_to_recent_activity',
              instruction: 'If you are not on the recent activity page, navigate to "https://www.linkedin.com/in/me/recent-activity/all/".'
            };
          } else if (postCount < 5) {
            currentPipelineStep = {
              stage: 'step3_extract_posts',
              instruction: `Currently saved ${postCount} posts. Target: Scrape Post #${postCount + 1}. Extract the text content of the user\'s most recent original posts (skip pure reposts/comments) and append to the "posts" array.`
            };
          } else {
            currentPipelineStep = {
              stage: 'step4_finish',
              instruction: `Scraped ${postCount} posts successfully. Call the "finish" action with the accumulated "posts" array.`
            };
          }
        } else if (label?.includes('verify-session')) {
          currentPipelineStep = {
            stage: 'verify_linkedin_session',
            instruction: 'Analyze the URL and accessibility tree to check if logged in. Look for nav links ("Home", "My Network") or sign-in buttons. Return "finish" with connected: true/false.'
          };
        } else if (label?.includes('post-content')) {
          currentPipelineStep = {
            stage: 'post_content_linkedin',
            instruction: 'Locate the "Start a post" button, open the editor modal, fill the text box with the content to post, click publish, and verify publication. Return "finish" with success: true once complete.'
          };
        }
      }

      const customPrefix = buildUserPrompt(attempt, maxAttempts, state, executionFeedback);
      
      const feedbackStr = executionFeedback ? `\n\n### LAST ACTION FEEDBACK:\n${executionFeedback}` : '';
      executionFeedback = null;

      let userContent = '';
      if (attempt === 1) {
        userContent += `[SYSTEM INSTRUCTIONS]:\n${systemPrompt}\n\n`;
      }

      userContent += `## CURRENT PIPELINE STAGE
CURRENT TASK STAGE: ${currentPipelineStep.stage}
${currentPipelineStep.instruction}

## ATTEMPT INFO
Attempt: ${attempt} of ${maxAttempts} (Budget/retry counter)

## STATE
Current Browser URL: ${state.url}
Page Accessibility Elements (Filtered Tree):
${typeof state.elements === 'string' ? state.elements : JSON.stringify(state.elements, null, 2)}
${feedbackStr}

## PROGRESS LOG
CLICKED_SELECTORS_OR_LINKS = ${JSON.stringify(clickedSelectors)}
VISITED_URLS = ${JSON.stringify(visitedUrls)}
ALREADY_OPENED_POST_IDS = ${JSON.stringify(openedPostIds)}
DATA_SAVED_SO_FAR = ${JSON.stringify(accumulatedData)}`;

      if (customPrefix && customPrefix.trim().length > 0) {
        userContent = userContent.replace('## CURRENT PIPELINE STAGE', `## CURRENT PIPELINE STAGE\n${customPrefix.trim()}\n`);
      }

      messages.push({ role: 'user', content: userContent });

      this.logger.log(`[${label}] Attempt ${attempt}/${maxAttempts}: requesting next action...`);
      const responseText = await this.generateCompletion(messages, responseFormat);
      
      let cleanedResponse = responseText.trim();
      const mdMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (mdMatch) {
        cleanedResponse = mdMatch[1].trim();
      }
      
      let agentAction: any;
      try {
        agentAction = JSON.parse(cleanedResponse);
      } catch (parseErr) {
        executionFeedback = `Failed to parse response as JSON: ${parseErr.message}. Ensure your output is a valid JSON object matching the requested schema.`;
        messages.push({ role: 'assistant', content: responseText });
        continue;
      }

      if (Array.isArray(agentAction)) {
        executionFeedback = "You returned an array of multiple actions. You must respond with exactly ONE JSON action object per turn — choose only the single next action to perform now.";
        messages.push({ role: 'assistant', content: responseText });
        continue;
      }

      const recognizedActions = ['navigate', 'click', 'wait', 'finish', 'fill'];
      if (!agentAction || typeof agentAction !== 'object' || !agentAction.action || typeof agentAction.action !== 'string' || !recognizedActions.includes(agentAction.action.trim())) {
        executionFeedback = `Your response is missing a valid "action" key or the action is not recognized. Recognized actions are: ${recognizedActions.join(', ')}. Please return exactly ONE JSON action object per turn.`;
        messages.push({ role: 'assistant', content: responseText });
        continue;
      }

      // Save the LLM's response as assistant role
      messages.push({ role: 'assistant', content: responseText });

      // Accumulate any data returned in this step
      this.accumulateActionData(accumulatedData, agentAction);
      this.logger.log(`[${label}] Accumulated data so far: ${JSON.stringify(accumulatedData)}`);

      this.logger.log(`[${label}] Attempt ${attempt}: thought=${agentAction.thought || 'None'} action=${agentAction.action}`);

      if (agentAction.action === 'finish') {
        if (handleFinish) {
          const verdict = await handleFinish(agentAction, attempt, maxAttempts);
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

    throw new Error(`Agent loop [${label}] exceeded max steps (${maxAttempts}) without a finish action and no accumulated data.`);
  }
}
