import { Injectable, Logger } from '@nestjs/common';
import { DeviceHookService } from './device-hook.service';
import { GeminiService, PipelineStage, PipelineContext } from '../onboarding/gemini.service';
import { getAgentById } from '../agents/instances';
import { MemoryService } from '../memory/memory.service';
import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

interface SessionStatus {
  connected: boolean;
  username?: string | null;
  error?: string;
}

const PLATFORM_HINTS: Record<string, string> = {
  instagram:
    'Look for a "Messages" or "Direct" link and a profile avatar in the nav; logged-out shows "Log in"/"Sign up" buttons.',
  linkedin:
    'Look for "Home", "My Network", "Jobs", "Messaging" nav items and a profile photo; logged-out shows a "Sign in" button.',
};

const SCRAPE_PLATFORM_HINTS: Record<string, string> = {
  linkedin: `# SEQUENTIAL SCRAPING PIPELINE (Execute line-by-line like Python code):
# -------------------------------------------------------------
# step1_navigate_to_recent_activity()
#     # If you are not on the right page, "navigate" to "https://www.linkedin.com/in/me/recent-activity/all/".
#
# step2_wait_for_load()
#     # If posts haven't loaded yet, use "wait" action.
#
# step3_extract_posts()
#     # Extract the text content of 5 to 7 of the user's most recent original posts (skip pure reposts/comments).
#
# step4_finish()
#     # Once you can read enough post text from the accessibility tree, call "finish" action with the "posts" array.`,
  instagram: `# SEQUENTIAL SCRAPING PIPELINE (Execute line-by-line like Python code):
# -------------------------------------------------------------
# step1_navigate_to_profile()
#     # Start from the Instagram home page, locate the link/avatar for the user's own profile (usually the "Profile" nav item or the account avatar linking to "/<username>/"), then "navigate"/click there.
#
# step2_scrape_bio()
#     # Once on the profile page, first extract the user's bio text near the top of the profile page.
#     # Save this bio in the "bio" field of your action JSON.
#     # DO NOT call the "finish" action after this step. You must immediately proceed to step3_scrape_posts_sequentially() by executing a "click" action on a post.
#
# step3_scrape_posts_sequentially()
#     # For post in visible posts:
#     #     # 1. You MUST be on the profile page (URL ends with '/<username>/') to click a post.
#     #     # 2. Pick a post link whose post ID is NOT in ALREADY_OPENED_POST_IDS.
#     #     # 3. click_post(selector) -> Opens the post modal/page.
#     #     # 4. extract_caption() -> Read the caption and save/append it to "posts" array in the action JSON.
#     #     # 5. return_to_profile() -> You MUST go back to the profile page (e.g. click "Close" button or navigate back to the profile URL) BEFORE attempting to click the next post. Do not try to click another post while a post details view is open.
#     #     # Repeat until you have scraped 5 to 7 posts.
#
# step4_finish()
#     # Call "finish" action with all accumulated "posts" (between 5 and 7) and the "bio".`,
};

import { BrowserPipelineService } from './browser-pipeline.service';

@Injectable()
export class SocialMediaService {
  private readonly logger = new Logger(SocialMediaService.name);

  constructor(
    private readonly deviceHookService: DeviceHookService,
    private readonly browserPipelineService: BrowserPipelineService,
    private readonly geminiService: GeminiService,
    private readonly memoryService: MemoryService,
  ) { }

//   private sleep(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   /**
//    * Extracts a structured, noise-filtered representation of the page's accessibility
//    * elements. This is the platform-agnostic "state" every agent loop reasons over.
//    */

//   private async getBrowserState(): Promise<{ url: string; elements: string }> {
//     return this.browserPipelineService.getBrowserState();
//   }

//   /** Shared user-prompt builder for the browser-state-driven agent loops. */
//   private buildBrowserUserPrompt(
//     prefix: string,
//     attempt: number,
//     maxAttempts: number,
//     state: { url: string; elements: string },
//     feedback: string | null,
//   ): string {
//     return prefix || '';
//   }

//   /** Shared navigate/click/wait executor used by the browser-driving agent loops. */
//   private async executeBrowserAction(
//     action: any,
//     opts: { navigateTimeoutMs?: number; clickTimeoutMs?: number } = {},
//   ) {
//     return this.browserPipelineService.executeBrowserAction(action, opts);
//   }

//   /**
//    * Runs the Gemini ReAct agent loop to verify the login session for a platform.
//    */
//   async verifySession(
//     platform: 'linkedin' | 'instagram',
//   ): Promise<SessionStatus> {
//     if (!this.deviceHookService.isHookConnected()) {
//       return {
//         connected: false,
//         error: 'device-hook desktop helper is not connected. Please open it.',
//       };
//     }

//     this.deviceHookService.setActiveSessionName(platform + '_session');

//     const agent = getAgentById('social-media');
//     if (!agent) {
//       return {
//         connected: false,
//         error:
//           'Social Media Agent template not found in backend configuration.',
//       };
//     }

//     this.logger.log(`Starting session verification for ${platform}...`);
//     const targetUrl =
//       platform === 'linkedin'
//         ? 'https://www.linkedin.com/feed/'
//         : 'https://www.instagram.com/';

//     try {
//       await this.deviceHookService.sendCommand('navigate', { url: targetUrl });
//       await this.sleep(4000);
//     } catch (err) {
//       return {
//         connected: false,
//         error: `Failed to navigate to ${platform}: ${err.message}`,
//       };
//     }

//     const platformHint =
//       PLATFORM_HINTS[platform] ||
//       'Analyze general authenticated vs login screen components.';

//     try {
//       const result = await this.geminiService.runAgentLoop({
//         label: `verify-session:${platform}`,
//         systemPrompt: agent.systemPrompt,
//         maxAttempts: 3,
//         getState: () => this.getBrowserState(),
//         buildUserPrompt: (attempt, maxAttempts, state, feedback) =>
//           this.buildBrowserUserPrompt(
//             `${agent.generatePrompt({ platform, platformHint })}\n      `,
//             attempt,
//             maxAttempts,
//             state,
//             feedback,
//           ),
//         handleFinish: async (action, attempt, maxAttempts) => {
//           if (action.confidence === 'low' && attempt < maxAttempts) {
//             this.logger.warn(
//               `Agent returned 'low' confidence status: ${action.reasoning || 'Wait requested'}. Waiting 3s to retry...`,
//             );
//             await this.sleep(3000);
//             return {
//               accept: false,
//               feedback:
//                 "Action outputted 'finish' with low confidence. Retrying verification check...",
//             };
//           }
//           return { accept: true };
//         },
//         executeAction: (action) =>
//           this.executeBrowserAction(action, {
//             navigateTimeoutMs: 15000,
//             clickTimeoutMs: 35000,
//           }),
//       });

//       return {
//         connected: !!result.connected,
//         username: result.username || null,
//       };
//     } catch (err) {
//       this.logger.error(`Error in session verification for ${platform}:`, err);
//       return { connected: false, error: `Agent error: ${err.message}` };
//     }
//   }

//   /**
//    * Runs the Gemini agent loop to post content on a platform.
//    */
//   async postContent(
//     platform: 'linkedin' | 'instagram',
//     content: string,
//   ): Promise<{ success: boolean; message: string }> {
//     if (!this.deviceHookService.isHookConnected()) {
//       return {
//         success: false,
//         message: 'device-hook desktop helper is not connected. Please open it.',
//       };
//     }

//     const session = await this.verifySession(platform);
//     if (!session.connected) {
//       return {
//         success: false,
//         message: `Not logged into ${platform}. Please log in first in the agent browser.`,
//       };
//     }

//     this.logger.log(`Starting content posting for ${platform}...`);

//     if (platform === 'instagram') {
//       return {
//         success: false,
//         message:
//           'Instagram posts require uploading an image/video. Automatic text-only posting is not supported by Instagram. Please use LinkedIn for text posts.',
//       };
//     }

//     const systemPrompt = `You are a social media automation assistant. Your job is to post the following content to the user's LinkedIn feed.
// Content to post:
// """
// ${content}
// """

// The browser is currently on LinkedIn Feed: https://www.linkedin.com/feed/

// You can execute the following JSON actions:
// 1. Click: {"action": "click", "selector": "..."}
// 2. Fill: {"action": "fill", "selector": "...", "text": "..."}
// 3. Wait: {"action": "wait", "ms": 2000}
// 4. Finish: {"action": "finish", "success": true/false, "message": "..."}

// Here are the standard selectors you can use on LinkedIn:
// - The "Start a post" button to open the editor modal: "button.share-box-feed-entry__trigger" or "div.share-box-feed-entry__trigger"
// - The post text box in the modal: "div.ql-editor" or "[role='textbox']"
// - The "Post" button to publish: "button.share-actions__post-button" or "button.share-box_actions-post"

// Rules:
// - Respond with a valid JSON object matching the supported actions.
// - Proceed step-by-step.
// - Verify that the post modal opens before trying to fill the text.
// - After clicking the post button, wait a few seconds and verify if the post modal is closed or if a success toast/dialog appears.`;

//     try {
//       const result = await this.geminiService.runAgentLoop({
//         label: `post-content:${platform}`,
//         systemPrompt,
//         maxAttempts: 3,
//         getState: () => this.getBrowserState(),
//         buildUserPrompt: (attempt, maxAttempts, state, feedback) =>
//           this.buildBrowserUserPrompt(
//             '',
//             attempt,
//             maxAttempts,
//             state,
//             feedback,
//           ),
//         executeAction: (action) =>
//           this.executeBrowserAction(action, {
//             navigateTimeoutMs: 15000,
//             clickTimeoutMs: 35000,
//           }),
//       });

//       return {
//         success: !!result.success,
//         message: result.message || 'Complete',
//       };
//     } catch (err) {
//       this.logger.error(`Error in posting for ${platform}:`, err);
//       return {
//         success: false,
//         message: `Agent posting failed: ${err.message}`,
//       };
//     }
//   }

//   private readonly calendarFallbackPath = path.resolve(
//     process.cwd(),
//     'data',
//     'social_calendar.json',
//   );



//   private buildInstagramScrapeStages(): PipelineStage[] {
//     return [
//       {
//         stage: 'step1_navigate_to_profile',
//         isActive: (ctx: PipelineContext) => !ctx.visitedUrls.some((u: string) => {
//           const pathStr = u.replace('https://www.instagram.com', '').replace('https://instagram.com', '');
//           return pathStr.length > 1 && !pathStr.startsWith('/p/') && !pathStr.startsWith('/direct/') && !pathStr.startsWith('/reels/') && !pathStr.startsWith('/explore/');
//         }),
//         instruction: () => 'Locate the link/avatar for the user\'s own profile (usually the "Profile" nav item or account avatar linking to "/<username>/"), then click or navigate there.'
//       },
//       {
//         stage: 'step2_scrape_bio',
//         isActive: (ctx: PipelineContext) => !(typeof ctx.accumulatedData.bio === 'string' && ctx.accumulatedData.bio.trim().length > 0),
//         instruction: () => 'Extract the bio text near the top of the profile page. Save it in the "bio" field. DO NOT call "finish" yet.'
//       },
//       {
//         stage: 'step3_scrape_posts_sequentially',
//         isActive: (ctx: PipelineContext) => (Array.isArray(ctx.accumulatedData.posts) ? ctx.accumulatedData.posts.length : 0) < 5,
//         instruction: (ctx: PipelineContext) => {
//           const postCount = Array.isArray(ctx.accumulatedData.posts) ? ctx.accumulatedData.posts.length : 0;
//           return `Currently saved ${postCount} posts. Click and scrape Post #${postCount + 1}.
// 1. You MUST be on the profile page to click a post.
// 2. Pick a post whose ID is NOT already opened.
// 3. Read the caption and append it to the "posts" array.
// 4. Close/navigate back to the profile before clicking the next post.`;
//         }
//       },
//       {
//         stage: 'step4_finish',
//         isActive: () => true,
//         instruction: (ctx: PipelineContext) => `Scraped ${ctx.accumulatedData.posts?.length ?? 0} posts. Call "finish" with the accumulated "posts" and "bio".`
//       },
//     ];
//   }

//   private buildLinkedinScrapeStages(): PipelineStage[] {
//     return [
//       {
//         stage: 'step1_navigate_to_recent_activity',
//         isActive: (ctx: PipelineContext) => !ctx.visitedUrls.some((u: string) => u.includes('/recent-activity/')),
//         instruction: () => 'Navigate to "https://www.linkedin.com/in/me/recent-activity/all/".'
//       },
//       {
//         stage: 'step3_extract_posts',
//         isActive: (ctx: PipelineContext) => (Array.isArray(ctx.accumulatedData.posts) ? ctx.accumulatedData.posts.length : 0) < 5,
//         instruction: (ctx: PipelineContext) => {
//           const postCount = Array.isArray(ctx.accumulatedData.posts) ? ctx.accumulatedData.posts.length : 0;
//           return `Currently saved ${postCount} posts. Extract the text of the user's most recent original posts (skip reposts/comments) and append to "posts".`;
//         }
//       },
//       {
//         stage: 'step4_finish',
//         isActive: () => true,
//         instruction: (ctx: PipelineContext) => `Scraped ${ctx.accumulatedData.posts?.length ?? 0} posts. Call "finish" with "posts".`
//       },
//     ];
//   }

//   /**
//    * Retrieves past posts (and bio, for Instagram) from connected social accounts using
//    * the same agent-loop pattern as verifySession: the LLM navigates/clicks/waits and
//    * extracts the actual post text and bio itself from the accessibility tree, instead
//    * of assuming a raw "content" scrape already returns structured data.
//    * Falls back to simulated posts if there's no device hook, or nothing could be extracted.
//    */
//   async getPastPosts(
//     platform: 'linkedin' | 'instagram',
//   ): Promise<{ posts: string[]; bio?: string }> {
//     try {
//       const stages = platform === 'instagram'
//         ? this.buildInstagramScrapeStages()
//         : this.buildLinkedinScrapeStages();

//       const startUrl = platform === 'linkedin'
//         ? 'https://www.linkedin.com/in/me/recent-activity/all/'
//         : 'https://www.instagram.com/';

//       const systemPrompt = `You are a browser automation agent scraping past ${platform} content for the current logged-in user.

// You can execute the following JSON actions:
// 1. Navigate: {"action": "navigate", "url": "..."}
// 2. Click: {"action": "click", "selector": "..."}
// 3. Wait: {"action": "wait", "ms": 2000}
// 4. Finish: {"action": "finish", "posts": [...], "bio": "optional"}

// Rules:
// - Respond ONLY with ONE valid JSON action object.
// - Do not click the same selector/link twice — check CLICKED_SELECTORS_OR_LINKS.
// - The "posts" array must contain the ACTUAL CAPTION TEXT of each post, extracted from the accessibility tree after opening it. NEVER put a URL, href, path, or selector into "posts" — that is a hard rule.
// - Only add an entry to "posts" AFTER you have actually opened that post and read its caption text.
// - Do not call "finish" until at least 5 valid caption texts are scraped, unless no posts exist at all.`;

//       const finishRequirements = platform === 'instagram'
//         ? [
//             { field: 'posts', minValidCount: 5, description: 'Each entry must be actual caption text, not a URL.' },
//             { field: 'bio', required: true, description: 'Extracted from the profile page.' },
//           ]
//         : [
//             { field: 'posts', minValidCount: 5, description: 'Each entry must be actual post text, not a URL.' },
//           ];

//       const result = await this.browserPipelineService.run({
//         label: `scrape-posts:${platform}`,
//         systemPrompt,
//         stages: stages,
//         startUrl,
//         maxAttempts: 20,
//         finishRequirements,
//       });

//       const posts = Array.isArray(result.posts)
//         ? result.posts.filter(
//             (p: any) => typeof p === 'string' && p.trim().length > 0,
//           )
//         : [];
//       const bio =
//         typeof result.bio === 'string' && result.bio.trim().length > 0
//           ? result.bio
//           : undefined;

//       if (posts.length > 0 || bio) {
//         this.logger.log(
//           `Successfully scraped ${platform} via agent loop. Posts: ${posts.length}${bio ? `, bio present` : ''}`,
//         );
//         return { posts, bio };
//       }
//     } catch (e) {
//       this.logger.warn(
//         `Failed to scrape past posts/profile from ${platform} via agent loop. Falling back to default list.`,
//         e,
//       );
//     }

//     return { posts: [] };
//   }

//   private cleanAndParseJson(raw: string): any {
//     let clean = raw.trim();
//     const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
//     const match = clean.match(markdownRegex);
//     if (match) {
//       clean = match[1].trim();
//     }

//     try {
//       return JSON.parse(clean);
//     } catch (directError) {
//       let inString = false;
//       let escape = false;
//       let braceCount = 0;
//       let startIndex = -1;
//       let endIndex = -1;
//       const firstChar = clean.match(/[\[{]/);

//       if (firstChar) {
//         const targetOpen = firstChar[0];
//         const targetClose = targetOpen === '[' ? ']' : '}';

//         for (let i = 0; i < clean.length; i++) {
//           const char = clean[i];
//           if (char === '\\') {
//             escape = !escape;
//             continue;
//           }
//           if (char === '"' && !escape) {
//             inString = !inString;
//           }
//           escape = false;

//           if (!inString) {
//             if (char === targetOpen) {
//               if (braceCount === 0) {
//                 startIndex = i;
//               }
//               braceCount++;
//             } else if (char === targetClose) {
//               braceCount--;
//               if (braceCount === 0) {
//                 endIndex = i;
//                 break;
//               }
//             }
//           }
//         }

//         if (startIndex !== -1 && endIndex !== -1) {
//           try {
//             return JSON.parse(clean.substring(startIndex, endIndex + 1));
//           } catch (subError) {
//             // ignore and throw directError
//           }
//         }
//       }
//       throw directError;
//     }
//   }

//   /**
//    * Generates a 7-day social media post calendar using the Context Builder and past posts
//    */
//   async generateCalendar(platform: 'linkedin' | 'instagram'): Promise<any[]> {
//     this.logger.log(`Generating 7-day post calendar for ${platform}...`);

//     const context = await this.memoryService.buildContext(
//       'company profile goals priorities',
//     );
//     const { posts: pastPosts, bio } = await this.getPastPosts(platform);

//     let bioContext = '';
//     if (platform === 'instagram' && bio) {
//       bioContext = `\nInstagram Profile Bio:\n"${bio}"\n`;
//     }

//     const systemPrompt = `You are a world-class social media strategist and growth copywriter for tech startups.
// Your goal is to generate a highly strategic, professional, and engaging 7-day post calendar for the startup's ${platform} channel.

// Analyze the startup's profile (priorities, bottlenecks, stage), their bio, and their past posting style:
// ${context}
// ${bioContext}

// Past posts style reference:
// ${pastPosts.map((p, idx) => `- Post #${idx + 1}: "${p}"`).join('\n')}

// Generate exactly 7 calendar entries (Day 1 through Day 7).
// - Make sure the posts are written in the brand voice of the startup.
// - Focus on addressing the priorities, bottlenecks, and stage (e.g. pre-launch vs beta).
// - Include hooks, strategic value, formatting (spacing, line breaks), and hashtags.
// - For Instagram, focus on visual content: carousel ideas, Reels concepts, story prompts, behind-the-scenes content, metrics highlights, and strong visual hooks. Include suggested image/video descriptions.
// - For LinkedIn, focus on professional lessons, system designs, and build-in-public growth.

// Your output MUST be a valid JSON array of objects with exactly this structure (no markdown wrappers, no introductory text):
// [
//   {
//     "day": "Day 1 (Monday)",
//     "topic": "topic description",
//     "content": "the actual social media post text content with line breaks",
//     "content_type": "carousel | reel | story | static_post",
//     "image_description": "a brief description of the suggested visual or video for this post",
//     "platform": "${platform}",
//     "time": "09:00 AM",
//     "rationale": "why this post is written and how it helps current startup goals (e.g., target enterprise ICP, solve hiring delay)"
//   }
// ]`;

//     const userPrompt = `Generate a 7-day post calendar in JSON for platform: "${platform}"`;

//     try {
//       const response = await this.geminiService.generateCompletion(
//         systemPrompt,
//         userPrompt,
//         { type: 'json_object' },
//       );

//       const calendar = this.cleanAndParseJson(response);
//       if (!Array.isArray(calendar)) {
//         throw new Error('LLM did not return an array');
//       }

//       await this.saveCalendar(calendar);
//       return calendar;
//     } catch (e) {
//       this.logger.error('Failed to generate or parse social calendar JSON', e);
//       throw e;
//     }
//   }

//   async getCalendar(): Promise<any[]> {
//     const mongoUri = process.env.MONGODB_URI;
//     const hasMongo =
//       mongoUri &&
//       !mongoUri.includes('<username>') &&
//       !mongoUri.includes('placeholder');

//     if (!hasMongo) {
//       try {
//         if (fs.existsSync(this.calendarFallbackPath)) {
//           const content = fs.readFileSync(this.calendarFallbackPath, 'utf8');
//           return JSON.parse(content);
//         }
//       } catch (e) {
//         this.logger.error('Failed to read fallback calendar file', e);
//       }
//       return [];
//     }

//     try {
//       const client = new MongoClient(mongoUri);
//       await client.connect();
//       const db = client.db();
//       const docs = await db.collection('social_calendar').find({}).toArray();
//       await client.close();
//       return docs;
//     } catch (error) {
//       this.logger.error(
//         'Failed to read calendar from MongoDB Atlas, checking fallback',
//         error,
//       );
//       try {
//         if (fs.existsSync(this.calendarFallbackPath)) {
//           const content = fs.readFileSync(this.calendarFallbackPath, 'utf8');
//           return JSON.parse(content);
//         }
//       } catch (e) {
//         // ignore
//       }
//       return [];
//     }
//   }

//   async saveCalendar(calendar: any[]): Promise<void> {
//     try {
//       const dir = path.dirname(this.calendarFallbackPath);
//       if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//       }
//       fs.writeFileSync(
//         this.calendarFallbackPath,
//         JSON.stringify(calendar, null, 2),
//         'utf8',
//       );
//     } catch (e) {
//       this.logger.error('Failed to save calendar to local fallback', e);
//     }

//     const mongoUri = process.env.MONGODB_URI;
//     const hasMongo =
//       mongoUri &&
//       !mongoUri.includes('<username>') &&
//       !mongoUri.includes('placeholder');

//     if (hasMongo) {
//       try {
//         const client = new MongoClient(mongoUri);
//         await client.connect();
//         const db = client.db();
//         await db.collection('social_calendar').deleteMany({});
//         if (calendar.length > 0) {
//           const cleanCalendar = calendar.map(({ _id, ...doc }) => doc);
//           await db.collection('social_calendar').insertMany(cleanCalendar);
//         }
//         await client.close();
//         this.logger.log('Social calendar saved in MongoDB Atlas.');
//       } catch (error) {
//         this.logger.error('Failed to save calendar to MongoDB Atlas', error);
//       }
//     }
//   }

//   private readonly sessionsFallbackPath = path.resolve(
//     process.cwd(),
//     'data',
//     'browser_sessions.json',
//   );

//   async getBrowserSessions(): Promise<string[]> {
//     const mongoUri = process.env.MONGODB_URI;
//     const hasMongo =
//       mongoUri &&
//       !mongoUri.includes('<username>') &&
//       !mongoUri.includes('placeholder');

//     let savedSessions: string[] = [];

//     if (!hasMongo) {
//       try {
//         if (fs.existsSync(this.sessionsFallbackPath)) {
//           const content = fs.readFileSync(this.sessionsFallbackPath, 'utf8');
//           savedSessions = JSON.parse(content);
//         }
//       } catch (e) {
//         this.logger.error('Failed to read fallback sessions file', e);
//       }
//     } else {
//       try {
//         const client = new MongoClient(mongoUri);
//         await client.connect();
//         const db = client.db();
//         const docs = await db.collection('browser_sessions').find({}).toArray();
//         await client.close();
//         savedSessions = docs.map((doc) => doc.name);
//       } catch (error) {
//         this.logger.error(
//           'Failed to read sessions from MongoDB Atlas, checking fallback',
//           error,
//         );
//         try {
//           if (fs.existsSync(this.sessionsFallbackPath)) {
//             const content = fs.readFileSync(this.sessionsFallbackPath, 'utf8');
//             savedSessions = JSON.parse(content);
//           }
//         } catch (e) {
//           // ignore
//         }
//       }
//     }

//     return Array.from(
//       new Set(savedSessions.filter((s) => s && s !== 'default')),
//     );
//   }

//   async saveBrowserSession(sessionName: string): Promise<void> {
//     const cleanName = (sessionName || '')
//       .trim()
//       .replace(/[^a-zA-Z0-9_-]/g, '_');
//     if (!cleanName || cleanName === 'default') return;

//     const current = await this.getBrowserSessions();
//     if (current.includes(cleanName)) return;

//     const updated = [...current, cleanName];

//     try {
//       const dir = path.dirname(this.sessionsFallbackPath);
//       if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//       }
//       fs.writeFileSync(
//         this.sessionsFallbackPath,
//         JSON.stringify(updated, null, 2),
//         'utf8',
//       );
//     } catch (e) {
//       this.logger.error('Failed to save sessions to local fallback', e);
//     }

//     const mongoUri = process.env.MONGODB_URI;
//     const hasMongo =
//       mongoUri &&
//       !mongoUri.includes('<username>') &&
//       !mongoUri.includes('placeholder');

//     if (hasMongo) {
//       try {
//         const client = new MongoClient(mongoUri);
//         await client.connect();
//         const db = client.db();
//         await db
//           .collection('browser_sessions')
//           .updateOne(
//             { name: cleanName },
//             { $set: { name: cleanName, createdAt: new Date() } },
//             { upsert: true },
//           );
//         await client.close();
//         this.logger.log(
//           `Session profile '${cleanName}' registered in MongoDB Atlas.`,
//         );
//       } catch (error) {
//         this.logger.error(
//           'Failed to save session profile to MongoDB Atlas',
//           error,
//         );
//       }
//     }
//   }

//   async launchBrowser(
//     sessionName: string,
//   ): Promise<{ success: boolean; message: string }> {
//     if (!this.deviceHookService.isHookConnected()) {
//       return {
//         success: false,
//         message: 'device-hook desktop helper is not connected.',
//       };
//     }
//     try {
//       const cleanName = (sessionName || 'default')
//         .trim()
//         .replace(/[^a-zA-Z0-9_-]/g, '_');
//       this.deviceHookService.setActiveSessionName(cleanName);
//       await this.deviceHookService.sendCommand('launch', {
//         sessionName: cleanName,
//       });

//       if (cleanName !== 'default') {
//         await this.saveBrowserSession(cleanName);
//       }

//       return {
//         success: true,
//         message: `Browser persistent session '${cleanName}' launched successfully.`,
//       };
//     } catch (err) {
//       return {
//         success: false,
//         message: `Failed to launch browser: ${err.message}`,
//       };
//     }
//   }

//   async closeBrowser(): Promise<{ success: boolean; message: string }> {
//     if (!this.deviceHookService.isHookConnected()) {
//       return {
//         success: false,
//         message: 'device-hook desktop helper is not connected.',
//       };
//     }
//     try {
//       await this.deviceHookService.sendCommand('close');
//       return { success: true, message: 'Browser closed successfully.' };
//     } catch (err) {
//       return {
//         success: false,
//         message: `Failed to close browser: ${err.message}`,
//       };
//     }
//   }

//   async getActiveSession(): Promise<{ activeSessionName: string }> {
//     return { activeSessionName: this.deviceHookService.getActiveSessionName() };
//   }
}
