"use client";

import { CheckSquare, FileText, Mail, Minus, Send, Square } from "lucide-react";
import { useState } from "react";
import { playRetroSound } from "@/lib/retroAudio";
import PixelHumanFigure from "./PixelHumanFigure";

export default function MichaelScottOSModal({
  agents,
  onClose,
  onDispatchTask,
  onUpdateAgent,
}) {
  const [activeApp, setActiveApp] = useState("email"); // "email" | "tasks" | "notes" | "mempalace"
  const [selectedEmailAgent, setSelectedEmailAgent] = useState("dwight");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sentNotification, setSentNotification] = useState("");

  // Sample Inbox Emails from Agents to Founder/Michael
  const initialEmails = [
    {
      id: "dwight",
      sender: "Dwight Schrute",
      role: "Capital & Grants Scout",
      subject: "RE: $100K NSF AI Innovation Grant Match Discovered!",
      time: "10:14 AM",
      unread: true,
      body: "MICHAEL / FOUNDER,\n\nI have identified a non-dilutive $100,000 NSF AI Innovation Grant with zero equity loss! Application deadline is September 15th. I have already auto-drafted the 1-page executive summary.\n\nBears. Beets. Non-dilutive Capital.\n\n- Dwight",
    },
    {
      id: "jim",
      sender: "Jim Halpert",
      role: "Browser Automation Agent",
      subject: "RE: Playwright CDP Device-Hook Post Verified",
      time: "09:48 AM",
      unread: false,
      body: "Hey Michael,\n\nJust published the scheduled founder update on LinkedIn & X using your authenticated Chrome profile (Port 9222). Zero API keys were needed and no captcha triggers encountered.\n\nLooking at camera...\n\n- Jim",
    },
    {
      id: "pam",
      sender: "Pam Beesly",
      role: "Social Content Designer",
      subject: "7-Day Founder Story Content Calendar Ready",
      time: "09:30 AM",
      unread: false,
      body: "Hi Michael,\n\nThe 7-day social media post calendar is ready for your review. It includes 14 custom visual banners for LinkedIn, X & Threads.\n\nLet me know if you want any color palette adjustments!\n\n- Pam",
    },
    {
      id: "stanley",
      sender: "Stanley Hudson",
      role: "Day Planner & Focus Manager",
      subject: "Founder Schedule: 4-Hour Deep Work Block Protected",
      time: "09:15 AM",
      unread: false,
      body: "Michael,\n\nI have blocked 9:00 AM - 1:00 PM on your calendar for uninterrupted deep work. I auto-declined two low-priority sales calls.\n\nDo not disturb during crossword time.\n\n- Stanley",
    },
    {
      id: "ryan",
      sender: "Ryan Howard",
      role: "Tech Events & Meetup Scout",
      subject: "AI Founder Demo Night - This Thursday 6:30 PM",
      time: "08:45 AM",
      unread: false,
      body: "Michael,\n\nFound a high-density VC & founder networking event: 'AI Founder Demo Night' at the Innovation Hub. RSVPs are locked in.\n\n- Ryan",
    },
    {
      id: "toby",
      sender: "Toby Flenderson",
      role: "Safety & Compliance Monitor",
      subject: "Weekly Social Posting Rate Limit Report",
      time: "08:30 AM",
      unread: false,
      body: "Michael,\n\nMonitoring human-like delay intervals (3.4s) on browser clicks. Zero shadowban flags detected across all social profiles.\n\n- Toby",
    },
    {
      id: "angela",
      sender: "Angela Martin",
      role: "SaaS Budget Auditor",
      subject: "Monthly LLM & Token Budget Audit Completed",
      time: "08:00 AM",
      unread: false,
      body: "Michael,\n\nTotal daily automation cost is $0.12. I also flagged $240/mo in unused software subscriptions for instant cancellation.\n\nBandit is safe.\n\n- Angela",
    },
  ];

  const [emails, setEmails] = useState(initialEmails);

  const selectedEmail =
    emails.find((e) => e.id === selectedEmailAgent) || emails[0];

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!emailBody.trim()) return;

    playRetroSound("click");
    onDispatchTask({
      prompt: emailSubject ? `${emailSubject}: ${emailBody}` : emailBody,
      targetAgent: selectedEmailAgent,
    });

    setSentNotification(
      `Email sent to ${selectedEmail?.sender}! Task dispatched.`,
    );
    setTimeout(() => setSentNotification(""), 4000);
    setEmailSubject("");
    setEmailBody("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none">
      {/* 90s RETRO CRT MONITOR CASING (Covers ~85% of viewport) */}
      <div className="w-[90vw] md:w-[85vw] h-[88vh] bg-[#c3c7cb] rounded-3xl border-8 border-[#999e9e] p-3 md:p-5 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col relative">
        {/* CRT Monitor Top Brand Header */}
        <div className="flex items-center justify-between mb-2 px-2 text-[#333]">
          <div className="flex items-center gap-3">
            <div
              className="size-3.5 rounded-full bg-[#859900] shadow-[0_0_8px_#859900] animate-pulse"
              title="CRT Power LED"
            />
            <span className="font-pixel text-xs text-[#222] font-bold tracking-widest uppercase">
              MUNDER DIFFLIN 1998 TRINITRON CRT MONITOR — EXECUTIVE OS v4.2
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playRetroSound("click");
              onClose();
            }}
            className="bg-[#dc322f] hover:bg-[#b91c1c] text-white px-3 py-0.5 rounded font-pixel text-xs border border-[#800] cursor-pointer shadow font-bold"
          >
            POWER OFF [X]
          </button>
        </div>

        {/* RETRO CRT SCREEN GLASS VIEWPORT */}
        <div className="flex-1 bg-[#008080] rounded-xl border-4 border-[#333] overflow-hidden flex flex-col relative shadow-inner">
          {/* WINDOWS XP BLUE TASKBAR AT BOTTOM */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-r from-[#245edb] via-[#3980f4] to-[#245edb] border-t-2 border-[#1c49b0] z-40 flex items-center justify-between px-2 shadow-lg">
            {/* Green XP Start Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playRetroSound("click");
                  setActiveApp("email");
                }}
                className="bg-gradient-to-r from-[#388e3c] to-[#4caf50] hover:from-[#2e7d32] text-white font-pixel text-xs px-3.5 py-1 rounded-r-md border border-[#1b5e20] shadow-md cursor-pointer flex items-center gap-1.5 font-bold"
              >
                <span className="text-amber-300 text-sm">❖</span>
                <span>start</span>
              </button>

              {/* Taskbar App Buttons */}
              <button
                type="button"
                onClick={() => setActiveApp("email")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-pixel transition-all cursor-pointer ${
                  activeApp === "email"
                    ? "bg-[#1c49b0] text-white border border-[#0d2a70] shadow-inner font-bold"
                    : "bg-[#3980f4]/60 text-slate-100 hover:bg-[#3980f4]"
                }`}
              >
                <Mail className="size-3.5 text-amber-300" />
                <span>MunderMail XP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveApp("tasks")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-pixel transition-all cursor-pointer ${
                  activeApp === "tasks"
                    ? "bg-[#1c49b0] text-white border border-[#0d2a70] shadow-inner font-bold"
                    : "bg-[#3980f4]/60 text-slate-100 hover:bg-[#3980f4]"
                }`}
              >
                <CheckSquare className="size-3.5 text-cyan-300" />
                <span>Agent Task Manager</span>
              </button>
            </div>

            {/* XP Digital Clock Tray */}
            <div className="bg-[#0f2b70] text-emerald-400 text-xs px-3 py-1 rounded border border-[#1c49b0] font-mono flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* DESKTOP WORKSPACE AREA */}
          <div className="flex-1 p-4 pb-14 overflow-hidden flex relative">
            {/* Left Desktop Shortcuts Column */}
            <div className="w-24 shrink-0 flex flex-col gap-4 z-10">
              <button
                type="button"
                onClick={() => setActiveApp("email")}
                className="flex flex-col items-center gap-1 group cursor-pointer text-white text-[10px] font-pixel p-1.5 rounded hover:bg-white/10"
              >
                <div className="size-10 bg-[#3980f4] rounded-lg border-2 border-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                  📧
                </div>
                <span className="text-center shadow-black drop-shadow">
                  MunderMail XP
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveApp("tasks")}
                className="flex flex-col items-center gap-1 group cursor-pointer text-white text-[10px] font-pixel p-1.5 rounded hover:bg-white/10"
              >
                <div className="size-10 bg-[#388e3c] rounded-lg border-2 border-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                  📋
                </div>
                <span className="text-center shadow-black drop-shadow">
                  Task Manager
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveApp("notes")}
                className="flex flex-col items-center gap-1 group cursor-pointer text-white text-[10px] font-pixel p-1.5 rounded hover:bg-white/10"
              >
                <div className="size-10 bg-[#f59e0b] rounded-lg border-2 border-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                  📝
                </div>
                <span className="text-center shadow-black drop-shadow">
                  Founder Notes
                </span>
              </button>
            </div>

            {/* ACTIVE WINDOW CONTAINER (CLASSIC WINDOWS XP STYLE) */}
            <div className="flex-1 h-full bg-[#ece9d8] rounded-t-lg border-2 border-[#0055ea] shadow-2xl flex flex-col overflow-hidden z-20">
              {/* XP Window Header Bar */}
              <div className="h-8 bg-gradient-to-r from-[#0058e6] via-[#2879ff] to-[#0047bf] px-3 flex items-center justify-between text-white font-pixel text-xs select-none">
                <div className="flex items-center gap-2">
                  {activeApp === "email" && (
                    <Mail className="size-4 text-amber-300" />
                  )}
                  {activeApp === "tasks" && (
                    <CheckSquare className="size-4 text-cyan-300" />
                  )}
                  {activeApp === "notes" && (
                    <FileText className="size-4 text-amber-300" />
                  )}
                  <span className="font-bold uppercase">
                    {activeApp === "email" &&
                      "MunderMail XP v4.2 — Michael Scott Executive Inbox"}
                    {activeApp === "tasks" &&
                      "Executive Agent Fleet Task Manager"}
                    {activeApp === "notes" &&
                      "Notepad XP — Founder Strategy Notes"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="size-5 bg-[#3980f4] border border-white/50 rounded flex items-center justify-center hover:bg-[#245edb]"
                  >
                    <Minus className="size-3 text-white" />
                  </button>
                  <button
                    type="button"
                    className="size-5 bg-[#3980f4] border border-white/50 rounded flex items-center justify-center hover:bg-[#245edb]"
                  >
                    <Square className="size-2.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="size-5 bg-[#e81123] border border-white/50 rounded flex items-center justify-center hover:bg-[#b91c1c] font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* WINDOW INNER CONTENT BODY */}
              <div className="flex-1 p-3 overflow-hidden bg-[#ece9d8]">
                {/* APP 1: MUNDERMAIL XP (EMAIL CLIENT TO ALL AGENTS) */}
                {activeApp === "email" && (
                  <div className="h-full flex flex-col lg:flex-row gap-3 overflow-hidden">
                    {/* Left: Email Inbox List */}
                    <div className="w-full lg:w-80 bg-white border border-[#7f9db9] rounded p-2 flex flex-col shrink-0 overflow-y-auto">
                      <div className="font-pixel text-[11px] text-[#0055ea] font-bold border-b border-[#7f9db9] pb-1.5 mb-2 flex items-center justify-between">
                        <span>📥 AGENT INBOX ({emails.length})</span>
                        <span className="text-[9px] text-slate-500">
                          Live Agent Mail
                        </span>
                      </div>

                      <div className="space-y-1.5 overflow-y-auto flex-1">
                        {emails.map((item) => {
                          const isSelected = item.id === selectedEmailAgent;
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => {
                                playRetroSound("click");
                                setSelectedEmailAgent(item.id);
                              }}
                              className={`w-full text-left p-2 rounded border cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-[#316ac5] text-white border-[#1c49b0] shadow"
                                  : "bg-[#f8f9fa] hover:bg-[#ece9d8] text-[#222] border-[#ccd]"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className="truncate">{item.sender}</span>
                                <span
                                  className={
                                    isSelected
                                      ? "text-amber-200"
                                      : "text-slate-500"
                                  }
                                >
                                  {item.time}
                                </span>
                              </div>
                              <div
                                className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-slate-100 font-bold" : "text-slate-700"}`}
                              >
                                {item.subject}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Email Detail View & Send Message Box */}
                    <div className="flex-1 bg-white border border-[#7f9db9] rounded p-3 flex flex-col overflow-hidden">
                      {/* Email Header */}
                      <div className="border-b border-[#7f9db9] pb-2 mb-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-pixel text-xs text-[#0055ea] font-bold">
                            {selectedEmail.subject}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold">
                            Received: {selectedEmail.time}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 mt-1 font-bold">
                          From:{" "}
                          <span className="text-[#0055ea]">
                            {selectedEmail.sender}
                          </span>{" "}
                          ({selectedEmail.role})
                        </div>
                      </div>

                      {/* Reading Pane */}
                      <div className="flex-1 bg-[#fdfdfd] border border-[#eee] p-3 rounded text-xs text-slate-800 font-mono whitespace-pre-line leading-relaxed overflow-y-auto mb-3 shadow-inner">
                        {selectedEmail.body}
                      </div>

                      {/* Notification Toast */}
                      {sentNotification && (
                        <div className="bg-emerald-100 border border-emerald-500 text-emerald-800 text-xs p-2 rounded mb-2 font-pixel font-bold">
                          ✓ {sentNotification}
                        </div>
                      )}

                      {/* Compose Email / Reply to Agent Form */}
                      <form
                        onSubmit={handleSendEmail}
                        className="bg-[#f0f4f9] border border-[#7f9db9] p-2.5 rounded space-y-2"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-700 font-pixel">
                            To Agent:
                          </span>
                          <select
                            value={selectedEmailAgent}
                            onChange={(e) =>
                              setSelectedEmailAgent(e.target.value)
                            }
                            className="bg-white border border-[#7f9db9] px-2 py-1 rounded text-xs text-slate-900 font-bold"
                          >
                            {agents.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.officeRole.split(" ")[0]})
                              </option>
                            ))}
                            <option value="all">
                              BROADCAST TO ALL AGENTS 📢
                            </option>
                          </select>
                        </div>

                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Subject (e.g. Execute LinkedIn batch / Crawl VC credits)"
                          className="w-full bg-white border border-[#7f9db9] px-2 py-1 text-xs rounded text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />

                        <div className="flex items-center gap-2">
                          <textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            placeholder={`Write instruction email to ${selectedEmail?.sender}...`}
                            rows={2}
                            className="flex-1 bg-white border border-[#7f9db9] p-2 text-xs rounded text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none"
                          />
                          <button
                            type="submit"
                            disabled={!emailBody.trim()}
                            className="bg-[#0055ea] hover:bg-[#0047bf] text-white font-pixel text-xs px-4 py-3 rounded border border-[#003da6] shadow cursor-pointer font-bold disabled:opacity-50 flex items-center gap-1 shrink-0"
                          >
                            <Send className="size-3.5" />
                            <span>SEND MAIL</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* APP 2: AGENT TASK MANAGER XP */}
                {activeApp === "tasks" && (
                  <div className="h-full bg-white border border-[#7f9db9] rounded p-3 flex flex-col overflow-y-auto space-y-3">
                    <div className="flex items-center justify-between border-b border-[#7f9db9] pb-2">
                      <h4 className="font-pixel text-xs text-[#0055ea] font-bold">
                        📋 ALL AGENTS LIVE TASK DASHBOARD ({agents.length})
                      </h4>
                      <span className="text-[10px] text-slate-500 font-bold">
                        Realtime Dispatch & Status
                      </span>
                    </div>

                    <div className="space-y-2 overflow-y-auto flex-1">
                      {agents.map((agent) => (
                        <div
                          key={agent.id}
                          className="bg-[#f8f9fa] border border-[#7f9db9] p-2.5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm hover:border-[#0055ea]"
                        >
                          <div className="flex items-center gap-3">
                            <PixelHumanFigure
                              agentId={agent.id}
                              size="sm"
                              isWorking={agent.status === "working"}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-pixel text-xs text-slate-900 font-bold">
                                  {agent.name}
                                </h5>
                                <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-[#0055ea] text-white font-bold">
                                  {agent.aiModel.split(" ")[0]}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-600 font-bold">
                                {agent.officeRole}
                              </p>
                              <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 mt-1 font-mono">
                                Task: {agent.activeTask}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-amber-600">
                              🏆 {agent.dundieScore} Pts
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                playRetroSound("click");
                                setActiveApp("email");
                                setSelectedEmailAgent(agent.id);
                              }}
                              className="bg-[#0055ea] hover:bg-[#0047bf] text-white font-pixel text-[10px] px-3 py-1.5 rounded border border-[#003da6] cursor-pointer font-bold shadow"
                            >
                              Dispatch Task ✉️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* APP 3: FOUNDER NOTES XP */}
                {activeApp === "notes" && (
                  <div className="h-full bg-white border border-[#7f9db9] rounded p-3 flex flex-col">
                    <div className="border-b border-[#7f9db9] pb-2 mb-2 font-pixel text-xs text-[#0055ea] font-bold">
                      📝 NOTEPAD XP — FOUNDER DAY STRATEGY
                    </div>
                    <textarea
                      defaultValue={`MUNDER DIFFLIN FOUNDER ROADMAP & DAY PLAN:\n\n1. Social Media: Pam & Jim batch 14 posts via CDP browser session.\n2. Grants & Capital: Dwight crawling NSF & SBIR non-dilutive grants.\n3. Focus Time: Stanley protecting 4-hour deep work coding block.\n4. Events & Safety: Ryan & Toby checking local demo nights and API rate limits.`}
                      className="flex-1 w-full p-3 font-mono text-xs text-slate-800 border border-[#eee] rounded resize-none focus:outline-none leading-relaxed"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
