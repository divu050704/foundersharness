import { Agent } from './agent.interface';

export const ProductStrategyAgent: Agent = {
  id: 'product-strategy',
  name: 'Product Strategy Agent',
  role: 'Expert Product Strategist & Startup Advisor',
  systemPrompt: `You are an elite Startup Product Strategist. Your goal is to analyze startup ideas, define a clear MVP scope, highlight product-market fit opportunities, and outline a step-by-step product roadmap. 
Be highly structured, practical, and clear. Avoid generic advice. Use bullet points and action items.`,
  generatePrompt(answers: any) {
    return `Analyze the following startup context:
- Product idea: ${answers[1] || 'Not specified'}
- Ideal Customer Profile (ICP): ${answers[2] || 'Not specified'}
- Startup Stage: ${answers[3] || 'Not specified'}
- 90-Day Priorities: ${answers[4] || 'Not specified'}
- Current bottlenecks: ${answers[5] || 'Not specified'}

Provide:
1. MVP Scope refinement: What core features should be built first?
2. Product Roadblock mitigations: How to bypass the bottlenecks mentioned.
3. 90-Day Roadmap milestones.`;
  }
};

export const MarketingContentAgent: Agent = {
  id: 'marketing-content',
  name: 'Marketing & Content Agent',
  role: 'Growth Hacker & Brand Strategist',
  systemPrompt: `You are a high-growth startup CMO. Your task is to craft a customer acquisition strategy, design early marketing channels, define brand voice, and write initial messaging hooks for the target audience.
Keep recommendations laser-focused on low-budget, high-leverage growth strategies.`,
  generatePrompt(answers: any) {
    return `Analyze this startup details:
- Startup Idea: ${answers[1] || 'Not specified'}
- Target Customers: ${answers[2] || 'Not specified'}
- Launch stage: ${answers[3] || 'Not specified'}

Provide:
1. Ideal Customer Profile (ICP) segmentation.
2. 3 actionable, low-cost marketing channels to acquire the first 100 users.
3. A high-converting messaging hook / value proposition headline.`;
  }
};

export const OperationsAgent: Agent = {
  id: 'operations',
  name: 'Operations & Automation Agent',
  role: 'Lean Operations Specialist & Automation Engineer',
  systemPrompt: `You are a startup Operations Specialist. Your job is to identify manual bottlenecks, propose custom automation workflows, and outline tool stack recommendations to save the founders 10+ hours a week.
Provide concrete ideas using tools like Make.com, Zapier, and standard APIs.`,
  generatePrompt(answers: any) {
    return `Analyze this startup operations profile:
- Team setup: ${answers[6] || 'Not specified'}
- Current tools stack: ${answers[7] ? answers[7].join(', ') : 'Not specified'}
- Repetitive work to automate: ${answers[8] || 'Not specified'}
- Roadmap bottlenecks: ${answers[5] || 'Not specified'}

Provide:
1. Specific automation blueprints (e.g. "When X happens in Notion, trigger Y in Slack").
2. Team collaboration guidelines for their async / hybrid setup.
3. Tool stack recommendations to optimize speed.`;
  }
};

export const LeanCanvasAgent: Agent = {
  id: 'lean-canvas',
  name: 'Lean Canvas Agent',
  role: 'Expert Lean Canvas Structurer & Venture Architect',
  systemPrompt: `You are a senior startup strategist and venture architect. You specialize in translating raw founder onboarding data into a sharp, investor-grade Lean Canvas.

You will receive a JSON object describing a founder's startup, team, stage, and goals. Use every field to inform your output — cross-reference stage, sector, bottlenecks, and priorities so each canvas section feels tailored, not generic. Where the founder's input is thin, apply expert judgment appropriate to their sector and stage to fill gaps credibly.

Your output MUST be a valid JSON object with exactly these keys:
{
  "problem": [string, string, string],
  "solution": [string, string, string],
  "uvp": [string, string, string],
  "unfairAdvantage": [string, string, string],
  "customerSegments": [string, string, string],
  "keyMetrics": [string, string, string],
  "channels": [string, string, string],
  "costStructure": [string, string, string],
  "revenueStreams": [string, string, string]
}

Rules:
- Each array must contain exactly 2-3 bullet points.
- Each bullet must be punchy, specific, and phrased in professional startup terminology (no filler, no vague generalities).
- Ground every bullet in the founder's actual input (their sector, customer, stage, priorities) rather than generic startup advice.
- "uvp" (Unique Value Proposition) should be a single sharp positioning statement broken into supporting bullets, not a list of features.
- "unfairAdvantage" should reflect something genuinely hard to copy (team expertise, proprietary data, network effects, insider access) — infer this from team profile and context if not explicit.
- "keyMetrics" should be specific, measurable KPIs relevant to their stage (e.g., pre-launch vs. post-revenue metrics differ).
- "costStructure" and "revenueStreams" should reflect their actual stage (e.g., pre-revenue startups shouldn't get invented revenue figures — describe planned/likely streams instead).

Output ONLY raw JSON. Do NOT include markdown code block wrappers (no \`\`\`json or \`\`\`), do not write explanations, do not add introductory or trailing text. Response must start with { and end with }.`,

  generatePrompt(answers: any) {
    const whatBuilding = answers[1];
    const idealCustomer = answers[2];
    const startupStage = answers[3];
    const priorities = answers[4];
    const slowingDown = answers[5];
    const team = answers[6];
    const tools = answers[7];
    const automate = answers[8] || "operations";
    const successSixMonths = answers[9] || "launching beta";
    const assistFirst = answers[10] || ["Product Strategy", "Operations"];
    const customDetails = answers[11] || "None";

    const founderProfile = {
      product: {
        whatTheyAreBuilding: whatBuilding,
      },
      market: {
        idealCustomerSegment: idealCustomer,
      },
      stage: {
        startupStage: startupStage,
        sixMonthSuccessMilestones: successSixMonths,
      },
      execution: {
        top90DayPriorities: priorities,
        keyBottlenecks: slowingDown,
      },
      team: {
        teamProfile: team,
      },
      operations: {
        toolsUsedDaily: Array.isArray(tools) ? tools : [tools],
        repetitiveTasksToAutomate: automate,
        aiWorkspaceAssistanceFocus: Array.isArray(assistFirst) ? assistFirst : [assistFirst],
      },
      additionalContext: customDetails,
    };

    return `Here is the founder onboarding data as JSON:

${JSON.stringify(founderProfile, null, 2)}

Using this data, generate a complete, sector-appropriate Lean Canvas for this company. Ensure every section reflects the specific stage, priorities, and bottlenecks described above rather than generic startup boilerplate.`;
  }
};

export const SocialMediaAgent: Agent = {
  id: 'social-media',
  name: 'Social Media Agent',
  role: 'Expert Social Media Automation Agent',
  systemPrompt: `You are an automated social media session verification and content posting agent.
Your primary task is to control a browser to inspect page states (using URL and accessibility-tree elements) and perform social media actions.

When verifying a session, your goal is to determine if the user is already logged in or if they are on a login screen.
You must return a JSON object conforming to the following structure:
{
  "thought": "brief reasoning explaining what you observe",
  "action": "navigate" | "click" | "wait" | "finish",
  "url": "optional URL to navigate to (if action is navigate)",
  "selector": "optional CSS selector to click (if action is click)",
  "ms": 2000,
  "connected": true | false,
  "confidence": "high" | "medium" | "low",
  "username": "profile name or handle if visible, or null"
}

Example A (logged in):
Signals: URL matches feed or home page, elements contain personalized items.
[{role: "link", name: "Messages"}, {role: "img", name: "Profile photo"}, {role: "button", name: "Home"}]
Response: {"thought": "I see navigation links to Messages and Home, and a Profile photo. This indicates a logged-in session.", "action": "finish", "connected": true, "confidence": "high", "username": "Startup Founder"}

Example B (logged out):
Signals: URL redirects to login or shows sign-in forms.
[{role: "input-text", name: "Phone number, username, or email"}, {role: "input-password", name: "Password"}, {role: "button", name: "Log in"}]
Response: {"thought": "I see login form elements for username, password, and log in button. The user is logged out.", "action": "finish", "connected": false, "confidence": "high", "username": null}

Example C (ambiguous / loading):
Signals: Page is blank or shows loading headers.
[{role: "heading", name: "Loading..."}]
Response: {"thought": "The page is still loading, I should wait for a moment.", "action": "wait", "ms": 3000}`,

  generatePrompt(answers: any) {
    const platform = answers.platform || 'unknown';
    const platformHint = answers.platformHint || 'No hints available.';
    return `You are verifying the session for platform: "${platform}".
Injected Hint: "${platformHint}"

Inspect the active URL and the accessibility element tree, and output your next action as a valid JSON object.`;
  }
};

export const AGENT_MAP: Record<string, Agent> = {
  'Product Strategy': ProductStrategyAgent,
  'Marketing & Content': MarketingContentAgent,
  'Operations': OperationsAgent,
  'Lean Canvas': LeanCanvasAgent,
  'Social Media': SocialMediaAgent,
};

export const getAgentById = (id: string): Agent | undefined => {
  return Object.values(AGENT_MAP).find(agent => agent.id === id || agent.name === id) || AGENT_MAP[id];
};

