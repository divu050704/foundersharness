// Founders Harness Agents Registry & Realtime State Helpers

export const INITIAL_AGENTS = [
  {
    id: "michael",
    name: "Michael Scott",
    officeRole: "Chief Founder Co-pilot / Regional Manager",
    harnessDomain: "Master Founder Orchestrator",
    aiModel: "Claude 3.7 Sonnet (Orchestrator)",
    avatarColor: "#f59e0b",
    avatarBg: "bg-amber-500/20 text-amber-500 border-amber-500",
    status: "working",
    currentThought: "That's what she said! Coordinating founder day plan & social calendar.",
    activeTask: "Delegating daily startup tasks & monitoring device-hook session",
    dundieTitle: "World's Best Founder Co-pilot 🏆",
    dundieScore: 9999,
    tasksCompleted: 154,
    linesWritten: 14200,
    coffeeCups: 8,
    memoryItems: [
      "Prefers high-level natural language prompts for startup execution",
      "Always verifies device-hook browser connection before posting",
      "MemPalace startup canvas master key active"
    ],
    logs: [
      "[ORCHESTRATOR] Initialized Founder Harness control plane",
      "[DELEGATE] Assigned LinkedIn & X post batch to Social Agent (Pam & Jim)",
      "[DELEGATE] Triggered non-dilutive grant crawl for Dwight"
    ]
  },
  {
    id: "pam",
    name: "Pam Beesly",
    officeRole: "Social Media Calendar Builder & Content Designer",
    harnessDomain: "Social Media Automation",
    aiModel: "Gemini 2.5 Flash",
    avatarColor: "#ec4899",
    avatarBg: "bg-pink-500/20 text-pink-500 border-pink-500",
    status: "working",
    currentThought: "Designing 7-day social content calendar with custom visuals 🎨",
    activeTask: "Building social media post calendar for LinkedIn, X & Threads",
    dundieTitle: "Master Content Calendar Artist 🏆",
    dundieScore: 1450,
    tasksCompleted: 92,
    linesWritten: 9800,
    coffeeCups: 5,
    memoryItems: [
      "Maintains founder brand voice & visual post aesthetics",
      "Queues 14 posts weekly for autonomous browser posting"
    ],
    logs: [
      "[SOCIAL] Built 7-day founder story content calendar",
      "[IMAGE] Generated high-converting post banner previews",
      "[QUEUE] Transferred 5 post payloads to Device-Hook poster"
    ]
  },
  {
    id: "jim",
    name: "Jim Halpert",
    officeRole: "Autonomous Browser Poster (Device-Hook Agent)",
    harnessDomain: "Browser Automation",
    aiModel: "Claude 3.5 Sonnet",
    avatarColor: "#06b6d4",
    avatarBg: "bg-cyan-500/20 text-cyan-500 border-cyan-500",
    status: "working",
    currentThought: "Looking at camera... Executing headless browser session post on X & LinkedIn.",
    activeTask: "Posting scheduled founder update via device-hook browser session",
    dundieTitle: "Stealth Browser Automation Award 🏆",
    dundieScore: 1380,
    tasksCompleted: 84,
    linesWritten: 12100,
    coffeeCups: 6,
    memoryItems: [
      "Uses device-hook browser sessions — zero social API keys required!",
      "Handles browser login cookies & session profile persistence"
    ],
    logs: [
      "[DEVICE-HOOK] Connected to local Playwright CDP browser helper on port 9222",
      "[POST] Successfully published founder update on LinkedIn profile",
      "[SESSION] Browser session 'founder_main' active & healthy"
    ]
  },
  {
    id: "dwight",
    name: "Dwight Schrute",
    officeRole: "Capital, Grants & VC Investment Scout",
    harnessDomain: "Capital & Grants Discovery",
    aiModel: "Grok-3 (Strict Verification)",
    avatarColor: "#10b981",
    avatarBg: "bg-emerald-500/20 text-emerald-500 border-emerald-500",
    status: "working",
    currentThought: "Bears. Beets. $100K Non-dilutive Grant match found!",
    activeTask: "Scouting NSF, SBIR, AWS Credits & Angel Investment opportunities",
    dundieTitle: "Top Capital & Grant Exterminator 🏆",
    dundieScore: 1620,
    tasksCompleted: 104,
    linesWritten: 15400,
    coffeeCups: 4,
    memoryItems: [
      "Zero tolerance for high-dilution predatory VC terms",
      "Scrapes NSF, SBIR grants & $250K AWS/GCP startup credits daily"
    ],
    logs: [
      "[GRANT] Discovered $100,000 AI Innovation Grant match (Deadline: Sept 15)",
      "[CREDITS] Matched $100K Google Cloud Startup credits package",
      "[PITCH] Prepared 1-page executive grant application draft"
    ]
  },
  {
    id: "stanley",
    name: "Stanley Hudson",
    officeRole: "Founder Day Planner & Focus Time Manager",
    harnessDomain: "Day Planning & Productivity",
    aiModel: "DeepSeek R1 (Logic Master)",
    avatarColor: "#3b82f6",
    avatarBg: "bg-blue-500/20 text-blue-500 border-blue-500",
    status: "thinking",
    currentThought: "Crossword puzzle done. Blocking 3 hours of uninterrupted deep work.",
    activeTask: "Optimizing founder calendar, blocking focus time & priority tasks",
    dundieTitle: "Pretzels & Uninterrupted Focus Award 🏆",
    dundieScore: 1120,
    tasksCompleted: 78,
    linesWritten: 8900,
    coffeeCups: 3,
    memoryItems: [
      "Will not schedule founder meetings past 5:00 PM",
      "Enforces 4-hour daily deep work focus blocks"
    ],
    logs: [
      "[PLANNER] Built founder daily schedule: 9:00 AM - 1:00 PM Deep Work",
      "[CALENDAR] Auto-declined 2 low-priority sales calls",
      "[FOCUS] Protected 3 hours of uninterrupted coding & product design"
    ]
  },
  {
    id: "ryan",
    name: "Ryan Howard",
    officeRole: "Local Meetups & Tech Event Scout",
    harnessDomain: "Networking & Demo Days",
    aiModel: "Claude 3.5 Haiku",
    avatarColor: "#a855f7",
    avatarBg: "bg-purple-500/20 text-purple-500 border-purple-500",
    status: "idle",
    currentThought: "Crawling Techstars Demo Day & local founder networking meetups.",
    activeTask: "Discovering local founder meetups, pitch competitions & VC socials",
    dundieTitle: "Hottest Networking Scout Award 🏆",
    dundieScore: 980,
    tasksCompleted: 62,
    linesWritten: 6700,
    coffeeCups: 7,
    memoryItems: [
      "Crawls Meetup.com, Eventbrite, Luma & Twitter Spaces for founder events",
      "Ranks events by investor density and founder relevance"
    ],
    logs: [
      "[MEETUP] Found 'AI Founder Demo Night' (Thursday, 6:30 PM)",
      "[NETWORKING] Added 4 VC pitch socials to founder calendar",
      "[EVENT] RSVPD for Local Startup Showcase"
    ]
  },
  {
    id: "toby",
    name: "Toby Flenderson",
    officeRole: "HR, API Rate Limit & Safety Guardrail Monitor",
    harnessDomain: "Safety & Compliance",
    aiModel: "Llama 3.3 (Safety Checked)",
    avatarColor: "#64748b",
    avatarBg: "bg-slate-500/20 text-slate-400 border-slate-500",
    status: "idle",
    currentThought: "Monitoring browser automation rate-limits & API quotas.",
    activeTask: "Ensuring social posting compliance & zero IP shadowban risk",
    dundieTitle: "Extreme Repetitive Stress & Safety Award 🏆",
    dundieScore: 520,
    tasksCompleted: 41,
    linesWritten: 3100,
    coffeeCups: 2,
    memoryItems: [
      "Enforces human-like delay between browser automation actions",
      "Keeps daily social posts under platform shadowban thresholds"
    ],
    logs: [
      "[SAFETY] Verified human-like delay interval (3.4s) on browser clicks",
      "[COMPLIANCE] Social posting rate limits healthy - 0 warnings"
    ]
  },
  {
    id: "angela",
    name: "Angela Martin",
    officeRole: "Startup Budget Auditor & API Billing Bot",
    harnessDomain: "Financial Audit & Billing",
    aiModel: "Codex Mini",
    avatarColor: "#ef4444",
    avatarBg: "bg-red-500/20 text-red-500 border-red-500",
    status: "working",
    currentThought: "Bandit the cat is safe. Auditing monthly SaaS & LLM token spend.",
    activeTask: "Tracking startup burn rate, API costs & software subscriptions",
    dundieTitle: "Tightest Startup Budgeter Award 🏆",
    dundieScore: 1240,
    tasksCompleted: 69,
    linesWritten: 5800,
    coffeeCups: 3,
    memoryItems: [
      "Maintains monthly LLM token spend under founder budget target",
      "Surfaces unused SaaS subscriptions for instant cancellation"
    ],
    logs: [
      "[FINANCE] Total daily API automation cost: $0.12",
      "[SAVINGS] Identified $240/mo in unused SaaS subscriptions to cancel"
    ]
  }
];

export const FOUNDER_DOMAINS = [
  { id: "social", name: "Social Media Automation", icon: "📱", desc: "Calendar Builder & Browser Poster" },
  { id: "capital", name: "Capital & Grants Discovery", icon: "💰", desc: "Grants, Credits & VC Scouting" },
  { id: "planner", name: "Day Planner & Focus Time", icon: "📅", desc: "Calendar Coordination & Task Focus" },
  { id: "meetups", name: "Local Meetups & Demo Days", icon: "🤝", desc: "Tech Events & Founder Networking" },
  { id: "browser", name: "Device-Hook CDP Bridge", icon: "🌐", desc: "Live Playwright Browser Sessions" }
];
