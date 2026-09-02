# Founders Harness — Backend API & AI Engine 🧠

The **Founders Harness Backend** is a NestJS application built to power autonomous AI executive agents, long-term memory graph storage, asynchronous task queues, and browser automation pipelines. It leverages **LangChain**, **LangGraph**, **BullMQ**, **Google Gemini**, **MongoDB**, **Redis**, and the **Hindsight Memory Engine**.

---

## 🏗️ Architecture & Modules

The backend service is structured into modular domains:

```
src/
├── agents/                      # Multi-Agent Framework & Execution Graphs
│   ├── employees/               # Employee service classes (Pamela, Derrick, Jimmy, Stan, Rory, Angelica, Tobias)
│   │   ├── PamelaMiller.service.ts
│   │   ├── DerrickVance.service.ts
│   │   ├── JimmyHarper.service.ts
│   │   ├── StanHayes.service.ts
│   │   ├── RoryHoward.service.ts
│   │   ├── AngelicaMartin.service.ts
│   │   └── TobiasHenderson.service.ts
│   ├── graphs/                  # LangGraph state machine executables per agent
│   │   ├── pamela-miller/       # GenerateSocialMediaCalendar.service.ts
│   │   ├── derrick-vance/       # ScoutGrantsAndCapital.service.ts
│   │   ├── jimmy-harper/        # ExecuteBrowserPosting.service.ts
│   │   ├── stan-hayes/          # OptimizeFounderCalendar.service.ts
│   │   ├── rory-howard/         # ScoutTechEvents.service.ts
│   │   ├── angelica-martin/     # AuditStartupBudget.service.ts
│   │   └── tobias-henderson/    # AuditSafetyGuardrails.service.ts
│   ├── agent-task.processor.ts  # BullMQ background worker task processor
│   ├── agent-personalities.ts   # Personality traits & capabilities matrix
│   ├── agents.service.ts        # Agent dispatcher & thread manager
│   └── agents.module.ts         # Module wiring & provider exports
├── memory/                      # Persistent Memory & Knowledge Layer
│   ├── hindsight.service.ts     # Integration with Hindsight vector bank engine
│   └── memory.service.ts        # MongoDB store for agent task results
├── onboarding/                  # Startup Onboarding & Lean Canvas Ingestion
└── browser/                     # Browser Control & DeviceHook Bridge
    ├── use-browser.service.ts   # LangGraph browser automation pipeline
    └── device-hook.service.ts   # WebSocket relay server (ws://localhost:5001)
```

---

## ⚡ Major Functions & Capabilities

### 1. Multi-Agent Fleet & Dual-Path Query Handling
- **7 Specialized AI Employees**:
  - **Pamela Miller**: Social Media Strategist (`create-calendar` tool).
  - **Derrick Vance**: Capital & VC Grant Scout (`scout-grants-capital` tool).
  - **Jimmy Harper**: Stealth Browser Automation Specialist (`execute-browser-posting` tool).
  - **Stan Hayes**: Day Planner & Focus Time Manager (`optimize-founder-calendar` tool).
  - **Rory Howard**: Tech Event & Social Scout (`scout-tech-events` tool).
  - **Angelica Martin**: Startup Budget & Billing Auditor (`audit-startup-budget` tool).
  - **Tobias Henderson**: HR & Safety Officer (`audit-safety-guardrails` tool).
- **Dual-Path Reply Engine**: Tool execution path for actionable requests vs conversational path for general questions/small talk without claiming unperformed work.

### 2. Asynchronous Queue Processing (BullMQ + Redis)
- **Non-Blocking Dispatch**: Incoming emails received via `POST /api/agents/reply-email` are enqueued directly to BullMQ queue `'agent-tasks'`.
- **Background Task Processor**: `AgentTaskProcessor` worker processes jobs (`process-pamela-miller`, `process-derrick-vance`, etc.) asynchronously and appends the agent's completed response email to the MongoDB thread.

### 3. Hindsight Vector Memory & Context Window Ingestion
- **Vector Bank Retention**: User email queries and preferences are retained in Hindsight banks using `hindsightService.retain(sender, content, context)`.
- **Context Preference Recall**: Prior to model invocation, agents recall user preferences and inject them into their LLM prompt context window.

### 4. Playwright Browser Sandbox (`UseBrowser`)
- **Browser Automation Sandbox**: Agents invoke `useBrowser.graph.invoke({ session: state.session, query, maxSteps: 5, stepNumber: 0 })` to collect live web data or perform tasks on behalf of the user.
- **Graceful Human Intervention**: State machines evaluate `humanInterventionCondition` and halt execution gracefully if human interaction (e.g. CAPTCHA) is required.

---

## 🔧 Environment Configuration

Create a `.env` file in `backend/`:

```env
# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000

# AI Models (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Databases & Queues
MONGODB_URI=mongodb://localhost:27017/foundersharness
REDIS_HOST=localhost
REDIS_PORT=6379

# Hindsight Memory Engine
HINDSIGHT_URL=http://localhost:8080

# Authentication (Better-Auth)
BETTER_AUTH_SECRET=your_secret_key
```

---

## 🚀 Installation & Running

```bash
cd backend
npm install
npm run start:dev
```

The API server will run on [http://localhost:5000/api](http://localhost:5000/api), with the WebSocket Relay running on `ws://localhost:5001`.

---

## 📡 API Endpoint Reference

### Agents Controller (`/api/agents`)

- `POST /api/agents/reply-email`
  - **Body**: `{ "receiver": "pamela.miller@foundersharness.ai", "content": "Build a 7-day launch calendar", "threadId": "..." }`
  - **Response**: `{ "reply": "I have initiated the process, will get back whenever it is completed" }`
- `GET /api/agents/threads`
  - **Response**: Array of MongoDB `EmailThread` documents.

### Onboarding Controller (`/api/onboarding`)

- `POST /api/onboarding`
  - **Body**: Array of onboarding answers `CreateOnboardingDto[]`.
- `POST /api/onboarding/extract`
  - **Body**: `LeanCanvasOutput` object.

### User Controller (`/api/user`)

- `GET /api/user/status`
  - Returns `{ "exists": boolean, "email": string }`.
- `GET /api/user/memory`
  - Returns knowledge graph node-edge data.
