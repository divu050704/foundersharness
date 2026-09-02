import { Agent } from './agent.interface';
import type { LeanCanvasOutput } from './schema';

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
    const automate = answers[8] || 'operations';
    const successSixMonths = answers[9] || 'launching beta';
    const assistFirst = answers[10] || ['Product Strategy', 'Operations'];
    const customDetails = answers[11] || 'None';

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
        aiWorkspaceAssistanceFocus: Array.isArray(assistFirst)
          ? assistFirst
          : [assistFirst],
      },
      additionalContext: customDetails,
    };

    return `Here is the founder onboarding data as JSON:

${JSON.stringify(founderProfile, null, 2)}

Using this data, generate a complete, sector-appropriate Lean Canvas for this company. Ensure every section reflects the specific stage, priorities, and bottlenecks described above rather than generic startup boilerplate.`;
  },
};
export const EntityExtractor: Agent = {
  id: "entitiy-extractor",
  name: "Entity Extraction Agent",
  role: "Extract entities and relationships from the canvas",
  systemPrompt: `You are a high-fidelity Memory Extraction Pipeline for a Founder's OS. 
Analyze the input text (onboarding details, transcripts, notes, etc.) and extract structured facts, entities, relationships, and chronological events.



Rules:
- Be highly precise. Do not invent connections that aren't mentioned or clearly implied in the text.
- If certain sections like 'entities' or 'timeline' have no data, leave them as empty arrays [].
- Output ONLY raw valid JSON starting with { and ending with }. Do not wrap in markdown \`\`\`json or add conversational text.`,

  generatePrompt(answers: LeanCanvasOutput) {
    let sourceLabel = 'Startup Founder';
    let sourceContent: string;
    sourceContent = JSON.stringify(answers, null, 2);
    return `${this.systemPrompt}
    Source: "${sourceLabel}"

Content to analyze:
${sourceContent}

Extract all structured facts, entities, relationships, and chronological events from the content above, following the JSON schema and rules defined in your instructions. Only extract what is explicitly present or clearly implied — do not fabricate entities, edges, or dates that aren't supported by the source.`;
  }
};

import { AGENT_PERSONALITIES } from './agent-personalities';

// ============================================================================
// AGENT FLEET: EMAIL & TASK PROMPTS FOR ALL FLEET AGENTS (COPYRIGHT-SAFE)
// ============================================================================

export const AlexRiveraAgent: Agent = {
  id: AGENT_PERSONALITIES['alex-rivera'].id,
  name: AGENT_PERSONALITIES['alex-rivera'].name,
  role: AGENT_PERSONALITIES['alex-rivera'].title,
  systemPrompt: AGENT_PERSONALITIES['alex-rivera'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above. Generate a warm introductory email from ${this.name} (${AGENT_PERSONALITIES['alex-rivera'].email}) greeting the founder, stating your role as ${this.role}, and explaining what you can do for them based on their raw Lean Canvas data. Signature Quirk: "${AGENT_PERSONALITIES['alex-rivera'].signatureQuirk}".`;
  },
};

export const SophiaChenAgent: Agent = {
  id: AGENT_PERSONALITIES['sophia-chen'].id,
  name: AGENT_PERSONALITIES['sophia-chen'].name,
  role: AGENT_PERSONALITIES['sophia-chen'].title,
  systemPrompt: AGENT_PERSONALITIES['sophia-chen'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above (problem, solution, unique value proposition, customer segments). Generate an introductory email from ${this.name} (${AGENT_PERSONALITIES['sophia-chen'].email}) greeting the founder, stating your role as ${this.role}, and explaining how you design 7-day social story content and post banners based on their raw Lean Canvas.`;
  },
};

export const LucasBennettAgent: Agent = {
  id: AGENT_PERSONALITIES['lucas-bennett'].id,
  name: AGENT_PERSONALITIES['lucas-bennett'].name,
  role: AGENT_PERSONALITIES['lucas-bennett'].title,
  systemPrompt: AGENT_PERSONALITIES['lucas-bennett'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above (channels, customer segments). Generate an introductory email from ${this.name} (${AGENT_PERSONALITIES['lucas-bennett'].email}) greeting the founder, stating your role as ${this.role}, and explaining how you execute headless Playwright CDP browser sessions on port 9222 to post updates with zero API keys required.`;
  },
};

export const VictorStoneAgent: Agent = {
  id: AGENT_PERSONALITIES['victor-stone'].id,
  name: AGENT_PERSONALITIES['victor-stone'].name,
  role: AGENT_PERSONALITIES['victor-stone'].title,
  systemPrompt: AGENT_PERSONALITIES['victor-stone'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above (problem, solution, cost structure, unfair advantage). Generate an urgent email from ${this.name} (${AGENT_PERSONALITIES['victor-stone'].email}) greeting the founder ("FOUNDER / MANAGER"), stating your role as ${this.role}, and explaining how you scout $100K NSF innovation grants and cloud credits matching their raw Lean Canvas.`;
  },
};

export const SamuelCrossAgent: Agent = {
  id: AGENT_PERSONALITIES['samuel-cross'].id,
  name: AGENT_PERSONALITIES['samuel-cross'].name,
  role: AGENT_PERSONALITIES['samuel-cross'].title,
  systemPrompt: AGENT_PERSONALITIES['samuel-cross'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above (key metrics, channels). Generate a direct schedule email from ${this.name} (${AGENT_PERSONALITIES['samuel-cross'].email}) greeting the founder concisely, stating your role as ${this.role}, and explaining how you protect 4-hour deep work focus blocks and decline unnecessary sales meetings.`;
  },
};

export const RomanColeAgent: Agent = {
  id: AGENT_PERSONALITIES['roman-cole'].id,
  name: AGENT_PERSONALITIES['roman-cole'].name,
  role: AGENT_PERSONALITIES['roman-cole'].title,
  systemPrompt: AGENT_PERSONALITIES['roman-cole'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above (customer segments, channels). Generate a networking email from ${this.name} (${AGENT_PERSONALITIES['roman-cole'].email}) greeting the founder, stating your role as ${this.role}, and detailing how you crawl high-density VC networking socials, founder meetups, and demo nights matching their startup domain.`;
  },
};

export const TylerReedAgent: Agent = {
  id: AGENT_PERSONALITIES['tyler-reed'].id,
  name: AGENT_PERSONALITIES['tyler-reed'].name,
  role: AGENT_PERSONALITIES['tyler-reed'].title,
  systemPrompt: AGENT_PERSONALITIES['tyler-reed'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above. Generate a safety & compliance email from ${this.name} (${AGENT_PERSONALITIES['tyler-reed'].email}) greeting the founder politely, stating your role as ${this.role}, and explaining how you monitor 3.4s human delays, rate limits, and zero shadowban compliance.`;
  },
};

export const AriaMorganAgent: Agent = {
  id: AGENT_PERSONALITIES['aria-morgan'].id,
  name: AGENT_PERSONALITIES['aria-morgan'].name,
  role: AGENT_PERSONALITIES['aria-morgan'].title,
  systemPrompt: AGENT_PERSONALITIES['aria-morgan'].systemPromptTemplate,
  generatePrompt(canvasData: LeanCanvasOutput | any) {
    const rawCanvasJson = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData, null, 2);
    return `${this.systemPrompt}

Here is the founder's raw Lean Canvas JSON file:
\`\`\`json
${rawCanvasJson}
\`\`\`

Analyze the raw Lean Canvas file above (cost structure, revenue streams). Generate a budget audit email from ${this.name} (${AGENT_PERSONALITIES['aria-morgan'].email}) greeting the founder formally, stating your role as ${this.role}, and detailing how you audit daily API token spend, track burn rate, and cancel unused SaaS subscriptions.`;
  },
};

export const ALL_AGENT_INSTANCES: Agent[] = [
  AlexRiveraAgent,
  SophiaChenAgent,
  LucasBennettAgent,
  VictorStoneAgent,
  SamuelCrossAgent,
  RomanColeAgent,
  TylerReedAgent,
  AriaMorganAgent,
];








