// Onboarding Question Definitions
export const QUESTIONS = [
  {
    id: 1,
    type: "textarea",
    title: "What are you building?",
    placeholder: "Describe your startup in 2–5 sentences.",
    purpose:
      "Understand the product, industry, problem being solved, and value proposition.",
    speechSnippet:
      "We are building an AI-powered co-pilot for product managers that turns customer interview recordings into formatted PRDs and Jira tickets.",
    microcopy:
      "That sounds exciting. AI-driven workflow optimization is a massive force multiplier.",
  },
  {
    id: 2,
    type: "textarea",
    title: "Who is your ideal customer?",
    placeholder:
      "Who benefits the most from your product? Individuals, businesses, enterprises, specific industries, etc.",
    purpose: "Identify the ICP.",
    speechSnippet:
      "Mid-to-large scale B2B SaaS companies, specifically product teams and engineering heads who spend hours aligning specifications.",
    microcopy:
      "Focused ICPs are key. This helps your AI teammate narrow down target market strategies.",
  },
  {
    id: 3,
    type: "options",
    title: "What stage is your startup currently in?",
    options: [
      "Just an idea",
      "Building MVP",
      "MVP launched",
      "Early customers",
      "Revenue generating",
      "Growing fast",
    ],
    purpose: "Identify product-market lifecycle.",
    microcopy: "Great, we're building a good understanding of your business.",
  },
  {
    id: 4,
    type: "textarea",
    title: "What are your top three priorities over the next 90 days?",
    placeholder:
      "Examples:\n• Launch Version 2\n• Get first paying customers\n• Raise funding\n• Hire engineers",
    purpose: "Align milestones.",
    speechSnippet:
      "1. Roll out our beta dashboard to 50 waitlist users. 2. Secure SOC2 compliance. 3. Close $250k in pre-seed commitments.",
    microcopy: "Got it. Focus on short-term milestones drives momentum.",
  },
  {
    id: 5,
    type: "textarea",
    title: "What's currently slowing your company down?",
    placeholder: "Describe your biggest bottlenecks.",
    purpose: "Determine operations bottlenecks.",
    speechSnippet:
      "Engineering speed is our main bottleneck right now. We are searching for a senior full-stack React/Node developer.",
    microcopy:
      "Bottlenecks are opportunities for automated leverage. We will set up AI routines for this.",
  },
  {
    id: 6,
    type: "textarea",
    title: "Tell us about your team.",
    placeholder: "How many founders? Employees? Contractors? Advisors?",
    purpose: "Analyze organizational makeup.",
    speechSnippet:
      "We are 2 co-founders, 2 full-time developers, and 1 design contractor.",
    microcopy:
      "Fascinating. A solid team profile helps the AI tailor its collaboration style.",
  },
  {
    id: 7,
    type: "multiselect-search",
    title: "Which tools do you use every day?",
    options: [
      "Gmail",
      "Google Calendar",
      "Slack",
      "Notion",
      "GitHub",
      "Linear",
      "Jira",
      "Reclaim",
      "HubSpot",
      "Discord",
      "WhatsApp",
      "Telegram",
      "Figma",
      "Google Drive",
    ],
    purpose: "Plan tool integrations.",
    microcopy:
      "Excellent. Integrating tools allows your AI to sync documents and calendars automatically.",
  },
  {
    id: 8,
    type: "textarea",
    title: "What repetitive work would you love to automate?",
    placeholder: "Think about tasks you do every week that waste time.",
    purpose: "Identify automation flows.",
    speechSnippet:
      "Synthesizing Slack discussions into weekly reports, and cross-posting product updates to LinkedIn.",
    microcopy:
      "Automations can free up 10+ hours a week. We will create these workflows.",
  },
  {
    id: 9,
    type: "textarea",
    title: "What does success look like in the next six months?",
    placeholder: "Describe your biggest milestone.",
    purpose: "Track growth metrics.",
    speechSnippet:
      "Hitting $15k monthly recurring revenue (MRR) and achieving a 45% customer retention rate.",
    microcopy: "We're almost there! Just a couple more details.",
  },
  {
    id: 10,
    type: "multiselect",
    title: "Where should your AI assist you first?",
    options: [
      "Marketing & Content",
      "Sales",
      "Product Strategy",
      "Fundraising",
      "Grant Discovery",
      "Meetings & Calendar",
      "Customer Support",
      "Hiring",
      "Operations",
      "Research",
    ],
    purpose: "Determine primary workspaces.",
    microcopy: "Setting up your initial dashboards to target those channels.",
  },
  {
    id: 11,
    type: "textarea",
    title: "One last question...",
    placeholder:
      "Is there anything about your company that an AI teammate should know from day one?",
    purpose: "Capture general exceptions.",
    speechSnippet:
      "We operate completely asynchronously and put a huge emphasis on writing detailed documentation.",
    microcopy:
      "Understood. The workspace is configured to prioritize async documentation.",
  },
];
