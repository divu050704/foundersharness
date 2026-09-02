# Founders Harness 🚀

**Founders Harness** is an autonomous AI Founder OS and multi-agent executive team platform. It empowers solo founders and startup teams by deploying specialized, autonomous AI agents (such as social media strategists, capital scouts, stealth browser specialists, and day planners) equipped with persistent long-term memory, real-time browser execution capabilities, and interactive web/desktop controls.

---

## 🏛️ System Architecture

Founders Harness is built as a micro-ecosystem comprising three core components:

```
                           ┌──────────────────────────┐
                           │    Next.js Web App       │
                           │   (Frontend Dashboard)   │
                           └──────┬────────────┬──────┘
                                  │            │
                         REST API │            │ WebSockets (ws:5001 & ws:9000)
                                  ▼            ▼
┌──────────────────────────┐  WebSocket  ┌──────────────────────────┐
│  C# .NET Tray Helper     │ ◄─────────► │  NestJS AI Backend       │
│  (Playwright Device Hook)│   ws:9000   │  (LangChain/LangGraph)   │
└──────────────────────────┘             └────────────┬─────────────┘
                                                      │ Memory & Persistence
                                                      ▼
                                         ┌──────────────────────────┐
                                         │ MongoDB, Redis & Hindsight│
                                         │  (Vector & Entity Graph) │
                                         └──────────────────────────┘
```

1. **`backend/` (AI Core & Server)**: Built with **NestJS**, **LangChain**, **LangGraph**, **BullMQ**, and **Google Gemini 3.5/3.6**. Houses long-term entity/vector memory (**Hindsight Service**), agent personality graphs, and asynchronous task execution queues (`agent-tasks`). Runs a WebSocket relay server on `ws://localhost:5001`.
2. **`webapp/` (Founder Workspace & Office UI)**: Built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**. Includes a gamified Pixel Office floor plan, interactive Lean Canvas onboarding wizard, memory graph viewer, social media management dashboard, and `DeviceHookBridge` WebSocket relay.
3. **`device-hook/` (Desktop Execution Bridge)**: A **C# .NET 8** Windows System Tray app running a native WebSocket server on `ws://localhost:9000`. Acts as an on-device execution engine allowing backend AI agents to control local **Playwright** browser instances (Chromium, Firefox, WebKit).

---

## ✨ Major Capabilities & Recent Features

### 🤖 Autonomous AI Executive Team & Fleet
- **Pamela Miller (Social Media Strategist)**: Designs 7-day story calendars and visual post banners.
- **Derrick Vance (Capital & VC Scout)**: Scouts non-dilutive $100K+ NSF/SBIR grants and AWS/GCP cloud credits.
- **Jimmy Harper (Stealth Browser Specialist)**: Automates social posting via headless CDP browser sessions on port 9222.
- **Stan Hayes (Founder Day Planner)**: Enforces 4-hour deep work focus blocks and declines low-value sales calls.
- **Rory Howard (Tech Event Scout)**: Crawls Luma, Eventbrite, and Twitter Spaces for VC demo nights.
- **Angelica Martin (Budget Auditor)**: Audits daily LLM token costs and cancels unused SaaS subscriptions.
- **Tobias Henderson (HR & Safety Officer)**: Monitors 3.4s human click delays and rate limit compliance.

### 🔄 Asynchronous Task Queue & Real-Time Polling (BullMQ + Redis)
- **Non-Blocking Agent Dispatch**: Email requests to agents are immediately enqueued to BullMQ (`agent-tasks`).
- **Instant User Feedback**: UI displays non-blocking status notifications and auto-polls every 5 seconds for completed background email responses.

### 🧠 Hindsight Vector Memory & Preferences Context Window
- **Vector Bank Retention**: User queries and preferences are retained in Hindsight vector banks (`hindsightService.retain`).
- **Context Window Preference Injection**: Before tool selection or response generation, agents recall user preferences and inject them into their LLM prompt context window.
- **Clean Storage Separation**: User query preferences are managed exclusively by Hindsight, while task outputs are stored in MongoDB.

### 🌐 Dual-WebSocket Device Hook Relay Architecture
- **Browser Sandbox Execution**: Agents collect web data and perform actions via local Playwright browser instances (`UseBrowser`).
- **DeviceHook Bridge**: Next.js frontend runs `DeviceHookBridge`, relaying messages between backend (`ws://localhost:5001`) and desktop tray helper (`ws://localhost:9000`).
- **Graceful Human Intervention Handling**: All LangGraph state machines include `humanInterventionCondition` routing to gracefully handle CAPTCHA or missing authentication requirements.

---

## 🛠️ Developer Guide: Creating & Connecting New Employees & Graphs Ground-Up

Follow this step-by-step guide to add a new AI employee and connecting graph to the Founders Harness fleet.

### 1. Architectural Execution Flow

```
Webapp UI (Email Reply)
   │ (POST /api/agents/reply-email)
   ▼
AgentsController -> AgentsService.replyAgent
   │ (Enqueue Job to BullMQ)
   ▼
BullMQ Queue ('agent-tasks') -> AgentTaskProcessor Worker
   │ (Async process)
   ▼
Employee Service (backend/src/agents/employees/<AgentName>.service.ts)
   │ 1. Hindsight.retain(query, contextString)
   │ 2. Memory.recall(query) & Hindsight.retrieveMemory(query)
   │ 3. Tool invocation or Conversational path
   ▼
LangGraph Executable (backend/src/agents/graphs/<agent-name>/<GraphName>.service.ts)
   │ 1. UseBrowser sandbox data collection / actions
   │ 2. Graceful humanInterventionCondition check
   ▼
Reply Email Saved to MongoDB Thread -> Frontend Auto-Refreshes
```

---

### 2. Step-by-Step Implementation Guide

#### Step 1: Define Personality in `agent-personalities.ts`

Add your agent to `backend/src/agents/agent-personalities.ts`:

```typescript
export const AGENT_PERSONALITIES: Record<string, AgentPersonality> = {
  "your-agent-id": {
    id: "your-agent-id",
    name: "Your Agent Name",
    email: "your.agent@foundersharness.ai",
    title: "Your Agent Title",
    harnessDomain: "Agent Specialization",
    aiModel: "Gemini 3.5 Flash",
    avatarColor: "#ec4899",
    avatarBg: "bg-pink-500/20 text-pink-500 border-pink-500",
    signatureQuirk: "Signature Quirk Tagline 🎨",
    personalitySummary: "Personality description...",
    toneAndVoice: "Professional, witty, detail-oriented.",
    greetingStyle: "Hi Founder!",
    capabilities: ["Capability 1", "Capability 2"],
    systemPromptTemplate: "..."
  }
};
```

---

#### Step 2: Create the LangGraph Executable Service

Create `backend/src/agents/graphs/<agent-name>/<GraphName>.service.ts`:

```typescript
import { GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class YourGraphService {
  private readonly logger = new Logger(YourGraphService.name);

  constructor(private readonly useBrowser: UseBrowser) {}

  private model = new ChatGoogleGenerativeAI({ model: "gemini-3.5-flash-lite" });

  private stateSchema = new StateSchema({
    session: z.string(),
    query: z.string(),
    memories: z.any(),
    scrapedData: z.array(z.any()).default(() => []),
    humanInterventionRequired: z.boolean().default(false),
    humanInterventionMessage: z.string().default(""),
    results: z.any(),
  });

  private browserActionNode: GraphNode<typeof this.stateSchema> = async (state) => {
    const browserResult = await this.useBrowser.graph.invoke({
      session: state.session,
      query: `Execute browser sandbox data collection for: ${state.query}`,
      maxSteps: 5,
      stepNumber: 0,
    });

    return {
      scrapedData: browserResult.dataFound || [],
      humanInterventionRequired: browserResult.humanInterventionRequired || false,
      humanInterventionMessage: browserResult.humanInterventionMessage || "",
    };
  };

  private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
    if (state.humanInterventionRequired) {
      this.logger.debug("Human intervention required. Stopping graph execution.");
      return END;
    }
    return "processNode";
  };

  private processNode: GraphNode<typeof this.stateSchema> = async (state) => {
    // Process results using LLM with state.memories and state.scrapedData...
    return { results: { status: "success" } };
  };

  graph = new StateGraph(this.stateSchema)
    .addNode("browserActionNode", this.browserActionNode)
    .addNode("processNode", this.processNode)
    .addEdge(START, "browserActionNode")
    .addConditionalEdges("browserActionNode", this.humanInterventionCondition, [END, "processNode"])
    .addEdge("processNode", END)
    .compile();
}
```

---

#### Step 3: Create the Employee Service

Create `backend/src/agents/employees/<AgentName>.service.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { YourGraphService } from "../graphs/<agent-name>/<GraphName>.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { MemoryService } from "../../memory/memory.service";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";

@Injectable()
export class YourEmployeeService {
  private readonly logger = new Logger(YourEmployeeService.name);

  constructor(
    private readonly yourGraphService: YourGraphService,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({ model: "gemini-3.5-flash-lite" });

  yourTool = tool(
    async ({ query, session }) => {
      const memories = await this.memory.recall(session, query);
      return await this.yourGraphService.graph.invoke({ query, memories, session });
    },
    {
      name: "your-tool-name",
      description: `
        Execute specific tool task ONLY when explicitly requested by user.
        DO NOT call this tool for casual conversation, small talk, or general questions.
      `,
      schema: z.object({ query: z.string(), session: z.string() }),
    }
  );

  modelWithTools = this.model.bindTools([this.yourTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["your-agent-id"];

    // 1. Save user query in Hindsight ONLY (pass context as a string)
    try {
      if (process.env.HINDSIGHT_URL) {
        await this.hindsightService.retain(sender, email.content, "User Email Query & Preference for Your Agent");
      }
    } catch (e) {
      this.logger.warn(`Hindsight retain warning: ${e}`);
    }

    // 2. Recall memories & Hindsight preferences for LLM context window
    const userMemories = await this.memory.recall(sender, email.content);
    let hindsightMemories: any = null;
    try {
      if (process.env.HINDSIGHT_URL) {
        hindsightMemories = await this.hindsightService.retrieveMemory(sender, email.content);
      }
    } catch (_e) {}

    const prompt = `
      You are ${personality.name}.
      PERSONALITY: ${personality.personalitySummary}
      PAST CONVERSATION: ${previousContext || "None"}
      RECALLED USER PREFERENCES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}
      USER REQUEST: ${email.content}
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "your-tool-name") {
        const messageResult = await this.yourTool.invoke(call);
        toolResult = typeof messageResult?.content === "string" ? JSON.parse(messageResult.content) : messageResult;
        await this.memory.save(sender, {
          type: "task-result",
          content: toolResult,
          summary: `Task executed for ${email.content}`,
          producedBy: "your-agent-id",
        });
      }
    }

    // 3. Dual-path reply generation (Tool Execution vs Conversational Query)
    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `Summarize completed work result... WORK RESULT: ${JSON.stringify(toolResult)}`;
    } else {
      finalPrompt = `Answer conversational request naturally without pretending work was done... USER REQUEST: ${email.content}`;
    }

    const response = await this.model.invoke(finalPrompt);
    return response.content;
  }
}
```

---

#### Step 4: Register in Worker (`agent-task.processor.ts`) & Service (`agents.service.ts`)

1. **In `backend/src/agents/agent-task.processor.ts`**:
   Add constructor dependency and handle job name `'process-your-agent'`.

2. **In `backend/src/agents/agents.service.ts`**:
   Add email mapping in `agentJobMap`:
   ```typescript
   const agentJobMap: Record<string, string> = {
     "your.agent@foundersharness.ai": "process-your-agent",
   };
   ```

---

#### Step 5: Register in `AgentsModule`

Add `YourEmployeeService` and `YourGraphService` to `providers` and `exports` in `backend/src/agents/agents.module.ts`.

---

## 🛠️ Prerequisites

Before installing Founders Harness, ensure your system meets the following requirements:

- **Operating System**: Windows 10/11 (for the C# Tray Helper; backend/webapp are cross-platform).
- **Node.js**: v20.0.0 or higher.
- **Package Manager**: `npm` (v10+) or `bun`/`pnpm`.
- **.NET SDK**: .NET 8.0 SDK (for building `device-hook`).
- **PowerShell**: PowerShell 5.1 or PowerShell Core 7+.
- **Database Services**:
  - **MongoDB**: Local instance (`mongodb://localhost:27017`) or MongoDB Atlas URI.
  - **Redis**: Local instance (`localhost:6379`) for BullMQ background task processing.
- **API Keys**:
  - **Google Gemini API Key** (`GEMINI_API_KEY`) for agent intelligence.

---

## 🚀 Quick Setup & Installation

### Option 1: Automated Windows Installer (Recommended)

Run the included PowerShell setup script:

```powershell
# Run from repository root in PowerShell
.\setup.ps1
```

---

### Option 2: Manual Installation (Step-by-Step)

#### 1. Setup Backend (`backend/`)

```bash
cd backend
npm install
npm run start:dev
```

Environment file `.env` in `backend/`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/foundersharness
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your_gemini_api_key_here
HINDSIGHT_URL=http://localhost:8080
```

---

#### 2. Setup Web App (`webapp/`)

```bash
cd webapp
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

#### 3. Setup Device Hook Helper (`device-hook/`)

```bash
cd device-hook
dotnet build -c Release
dotnet run
```
The helper will start in your Windows system tray, listening on `ws://localhost:9000`.

---

## 📁 Repository Structure

```
foundersharness/
├── backend/                  # NestJS API, LangChain/LangGraph AI engine, Hindsight memory, BullMQ
│   ├── src/
│   │   ├── agents/           # Agent personalities, employees, LangGraph graphs, task processor
│   │   │   ├── employees/    # Employee service classes (Pamela, Derrick, Jimmy, Stan, etc.)
│   │   │   └── graphs/       # LangGraph state machine executables per agent
│   │   ├── memory/           # Hindsight memory service & MongoDB vector tools
│   │   ├── onboarding/       # Lean canvas questionnaire & memory extraction
│   │   └── browser/          # WebSocket bridge & browser execution pipeline
│   └── package.json
├── webapp/                   # Next.js 16 frontend workspace UI
│   ├── src/
│   │   ├── app/              # Dashboard, onboarding, memory, social pages
│   │   └── components/       # Pixel office UI, lean canvas views, email modal
│   └── package.json
├── device-hook/              # C# .NET 8 Windows tray app & Playwright bridge
└── setup.ps1                 # Automated Windows setup & dependency script
```

---

## 🌐 WebSocket Protocol Reference

Founders Harness utilizes dual WebSocket channels for device control and relaying:

| Server | Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Relay** | `ws://localhost:5001` | JSON Event Protocol | Relays requests between NestJS AI backend and Next.js WebApp |
| **Device Hook** | `ws://localhost:9000` | Playwright CDP Protocol | Receives automation commands (`launch`, `navigate`, `click`, `fill`, `screenshot`, `content`) from local agents |

---

## 📄 License

UNLICENSED / Proprietary — Founders Harness Project. All rights reserved.
