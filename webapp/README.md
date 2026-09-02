# Founders Harness — Web Application 🎨

The **Founders Harness Web Application** is a modern, responsive founder dashboard and virtual office space built with **Next.js 16**, **React 19**, **Tailwind CSS v4**, **Biome**, and **Shadcn UI**.

---

## ✨ Features & User Experience

### 🏢 Gamified Pixel Office Workspace
- **Interactive Floor Map (`OfficeFloorMap`)**: Visual representation of your AI executive team working in a top-down retro office environment.
- **Agent Sprites & Dock**: Click on AI employees (like Pamela Miller) to inspect their current status, recent outputs, assigned tasks, and personality traits.
- **God Agent Bar & Conference Room**: Manage team-wide multi-agent brainstorming sessions and global directives.
- **Dundie Awards Tracker**: Fun achievement system recognizing milestone accomplishments across your startup journey.

### 📋 Interactive Lean Canvas Onboarding
- **Founder Questionnaire**: Dynamic multi-step wizard guiding founders through problem identification, solution validation, revenue model definition, and target customer profiling.
- **Lean Canvas Card View**: Live structured view of your startup canvas with instant extraction to backend Hindsight memory.

### 🧠 Hindsight Memory Knowledge Graph Viewer (`/dashboard/memory`)
- **Visual Entity Graph**: Interactive node-and-edge visualization rendering your company's long-term memory graph (customer personas, product features, past decisions, market strategy).

### 📅 Pamela Miller Social Media Hub (`/dashboard/social`)
- **AI Content Calendar Generator**: Request multi-week, multi-platform social media calendars from Pamela Miller.
- **Post Preview & Management**: Review generated posts across Twitter/X, LinkedIn, Instagram, and Reddit formats before scheduling.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Styling**: Tailwind CSS v4, Lucide React Icons, Radix UI, Class Variance Authority
- **State & Data Fetching**: TanStack React Query v5, Zustand, React Hook Form, Zod
- **Formating & Linting**: Biome
- **Testing**: Playwright (`@playwright/test`)

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js**: v20.0.0 or higher.
- **Backend API**: Backend running on `http://localhost:5000` (or configured API base URL).

### 1. Install Dependencies

```bash
cd webapp
npm install
```

### 2. Configure Environment Variables

Create `.env.local` in `webapp/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `next dev` | Starts Next.js development server on port 3000 |
| `build` | `next build` | Builds optimized production bundle |
| `start` | `next start` | Runs production server |
| `lint` | `biome check` | Runs Biome linter checks |
| `format` | `biome format --write` | Formats code with Biome |

---

## 📁 Directory Structure

```
webapp/src/
├── app/
│   ├── dashboard/            # Founder Executive Dashboard
│   │   ├── memory/           # Memory Graph Viewer Page
│   │   └── social/           # Pamela Miller Social Media Hub
│   ├── login/                # Auth & Login Page
│   ├── onboarding/           # Founder Lean Canvas Wizard
│   └── page.js               # Root Landing / Office View
├── components/
│   ├── DeviceHookBridge.jsx  # Client WebSocket bridge between Backend (ws://localhost:5001) & device-hook (ws://localhost:9000)
│   ├── dashboard/            # Revenue charts, stat cards, recent orders
│   ├── layout/               # Navbar & Sidebar navigation
│   ├── office/               # Pixel Office floor map, sprites, docks, modals
│   ├── onboarding/           # Lean Canvas visual cards
│   └── ui/                   # Shared UI primitives (buttons, cards, dialogs)
└── lib/                      # API client utilities & auth helpers
```
