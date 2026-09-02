"use client";

import { CheckSquare, FileText, Mail, Minus, Send, Square, Paperclip } from "lucide-react";
import { useState, useEffect } from "react";
import { playRetroSound } from "@/lib/retroAudio";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import PixelHumanFigure from "./PixelHumanFigure";

export function formatEmailDate(dateInput) {
  if (!dateInput) return "Today";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Today";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays === 2) {
    return "2 days ago";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}



export default function ExecutiveCoPilotModal({
  agents,
  onClose,
  onDispatchTask,
  onUpdateAgent,
}) {
  const { data: sessionData } = authClient.useSession();
  const [currentUser, setCurrentUser] = useState({
    name: "Founder",
    email: "founder@harness.io",
  });

  useEffect(() => {
    if (sessionData?.user) {
      setCurrentUser({
        name: sessionData.user.name || "Founder",
        email: sessionData.user.email || "founder@harness.io",
      });
    } else {
      const stored = localStorage.getItem("founder_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser({
            name: parsed.name || "Founder",
            email: parsed.email || "founder@harness.io",
          });
        } catch (_e) {}
      }
    }
  }, [sessionData]);

  const [activeApp, setActiveApp] = useState("email"); // "email" | "tasks" | "notes" | "mempalace"
  const [selectedEmailId, setSelectedEmailId] = useState("demo-1");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailAttachments, setEmailAttachments] = useState("");
  const [sentNotification, setSentNotification] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [emails, setEmails] = useState([]);

  // Helper to send email to backend API
  const sendEmailToAgent = async (payload) => {
    try {
      return await api.post("/api/agents/reply-email", payload);
    } catch (err) {
      console.error("Failed to send email to agent:", err);
    }
  };

  // Fetch threads from backend DB on mount and poll periodically for background agent completions
  useEffect(() => {
    async function loadThreads() {
      try {
        const res = await api.get("/api/agents/threads");
        if (Array.isArray(res) && res.length > 0) {
          const formatted = res.flatMap((thread) => {
            const subject = thread.subject || "No Subject";
            return (thread.emails || []).map((email, idx) => {
              const matchingAgentSender = agents.find(
                (a) => a.email === email.sender
              );
              const matchingAgentReceiver = agents.find(
                (a) => a.email === email.receiver
              );
              const isSenderAgent =
                matchingAgentSender !== undefined ||
                (email.sender &&
                  (email.sender.includes('@foundersharness.ai') ||
                    email.sender.includes('@foundersharness.ai')));
              const agentObj = matchingAgentSender || matchingAgentReceiver;
              const createdAt = email.createdAt ? new Date(email.createdAt) : new Date();

              return {
                id: thread._id ? `${thread._id}-${idx}` : `thread-${Date.now()}-${idx}`,
                threadId: thread._id,
                agentId: agentObj?.id || "agent",
                sender: isSenderAgent ? (matchingAgentSender?.name || email.sender) : (currentUser.name || "Founder"),
                senderEmail: isSenderAgent ? email.sender : (currentUser.email || "founder@harness.io"),
                receiver: email.receiver || matchingAgentReceiver?.email || "",
                role: isSenderAgent ? (matchingAgentSender?.officeRole || "Agent") : "Founder",
                isSenderAgent: isSenderAgent,
                subject: subject,
                createdAt: createdAt,
                time: createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                unread: false,
                body: email.content || "",
                attachments: email.attachments || [],
              };
            });
          });
          if (formatted.length > 0) {
            setEmails(formatted);
          }
        }
      } catch (err) {
        console.error("Failed to load threads from backend:", err);
      }
    }
    loadThreads();
    const interval = setInterval(loadThreads, 5000);
    return () => clearInterval(interval);
  }, [agents, currentUser]);

  const selectedEmail =
    emails.find((e) => e.id === selectedEmailId) || emails[0] || null;

  // Filter agent suggestions based on user input into recipient text field
  const query = recipientEmail.trim().toLowerCase();
  const suggestions = agents.filter((a) => {
    if (!query) return true;
    return (
      a.name.toLowerCase().includes(query) ||
      (a.email && a.email.toLowerCase().includes(query)) ||
      a.id.toLowerCase().includes(query) ||
      a.officeRole.toLowerCase().includes(query)
    );
  });

  const handleComposeClick = () => {
    playRetroSound("click");
    setRecipientEmail("");
    setEmailSubject("");
    setEmailAttachments("");
    setEmailBody("");
    setShowForm(true);
  };

  const handleReplyClick = () => {
    playRetroSound("click");
    if (selectedEmail) {
      setRecipientEmail(selectedEmail.senderEmail || selectedEmail.sender);
      setEmailSubject(`Re: ${selectedEmail.subject}`);
      setEmailAttachments("");
      setEmailBody("");
      setShowForm(true);
    }
  };

  const handleReplyEmail = async (e) => {
    e.preventDefault();
    if (!emailBody.trim() || !recipientEmail.trim() || !selectedEmail) return;

    playRetroSound("click");

    const attachmentList = emailAttachments
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      receiver: recipientEmail.trim(),
      content: emailBody,
      attachments: attachmentList,
      subject: emailSubject || "No Subject",
      threadId: selectedEmail.threadId
    };

    try {
      const response = await api.post("/api/agents/reply-email", payload);
      
      const now = new Date();
      
      const myReply = {
        id: `email-${now.getTime()}-me`,
        threadId: selectedEmail.threadId,
        agentId: selectedEmail.agentId,
        sender: currentUser.name || "Founder",
        senderEmail: currentUser.email || "founder@harness.io",
        receiver: recipientEmail.trim(),
        role: "Founder",
        isSenderAgent: false,
        subject: emailSubject || "No Subject",
        createdAt: now,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        unread: false,
        body: emailBody,
        attachments: attachmentList,
      };

      setEmails((prev) => [myReply, ...prev]);
      
      setSentNotification(response?.reply || "Reply sent! Task running in background queue.");
      setTimeout(() => setSentNotification(""), 6000);
      setRecipientEmail("");
      setEmailSubject("");
      setEmailBody("");
      setEmailAttachments("");
      setShowForm(false);
      return { success: true, data: response };
    } catch (error) {
      console.error("Error sending email to /api/agents/reply-email:", error);
      setSentNotification("Failed to send reply.");
      setTimeout(() => setSentNotification(""), 4000);
      return { success: false, error };
    }
  };

const handleSendEmail = async (e) => {
  e.preventDefault();
  if (!emailBody.trim() || !recipientEmail.trim()) return;

  playRetroSound("click");

  const attachmentList = emailAttachments
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const subjectText = emailSubject.trim() || "New Task Instruction";
  const targetEmail = recipientEmail.trim();
  const now = new Date();

  if (targetEmail.toLowerCase() === "all" || targetEmail.toLowerCase() === "all.agents@foundersharness.ai") {
    const newThreads = [];
    for (const agent of agents) {
      const receiverEmail = agent.email || `${agent.id}@foundersharness.ai`;

      sendEmailToAgent({
        receiver: receiverEmail,
        content: emailBody,
        attachments: attachmentList,
        subject: subjectText,
      });

      newThreads.push({
        id: `thread-${now.getTime()}-${agent.id}`,
        agentId: agent.id,
        sender: currentUser.name || "Founder",
        senderEmail: currentUser.email || "founder@harness.io",
        receiver: receiverEmail,
        role: agent.officeRole,
        subject: `[Broadcast] ${subjectText}`,
        createdAt: now,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        unread: false,
        body: emailBody,
        attachments: attachmentList,
      });
    }

    setEmails((prev) => [...newThreads, ...prev]);
    if (newThreads.length > 0) {
      setSelectedEmailId(newThreads[0].id);
    }
    onDispatchTask({
      prompt: `${subjectText}: ${emailBody}`,
      targetAgent: "all",
    });
    setSentNotification("Broadcast email sent to all agents! Threads created.");
  } else {
    const targetAgentObj = agents.find(
      (a) => a.email?.toLowerCase() === targetEmail.toLowerCase() || a.id === selectedAgentId
    );

    await sendEmailToAgent({
      receiver: targetEmail,
      content: emailBody,
      attachments: attachmentList,
      subject: subjectText,
    });

    const newThread = {
      id: `thread-${now.getTime()}-${Math.random().toString(36).substr(2, 5)}`,
      agentId: targetAgentObj?.id || "agent",
      sender: currentUser.name || "Founder",
      senderEmail: currentUser.email || "founder@harness.io",
      receiver: targetEmail,
      role: targetAgentObj?.officeRole || "Agent",
      subject: subjectText,
      createdAt: now,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      unread: false,
      body: emailBody,
      attachments: attachmentList,
    };

    setEmails((prev) => [newThread, ...prev]);
    setSelectedEmailId(newThread.id);

    onDispatchTask({
      prompt: `${subjectText}: ${emailBody}`,
      targetAgent: targetAgentObj?.id || "all",
    });

    setSentNotification(
      `Email sent to ${targetAgentObj?.name || targetEmail}! Thread created.`
    );
  }

  setTimeout(() => setSentNotification(""), 4000);
  setRecipientEmail("");
  setEmailSubject("");
  setEmailBody("");
  setEmailAttachments("");
  setShowSuggestions(false);
  setShowForm(false);
};

// Group emails by thread to show only the latest email per thread in the inbox list
const uniqueThreads = [];
const seenThreads = new Set();

// Sort emails newest first to get the latest email for each thread
const sortedEmails = [...emails].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

for (const email of sortedEmails) {
  if (email.threadId && !seenThreads.has(email.threadId)) {
    seenThreads.add(email.threadId);
    uniqueThreads.push(email);
  } else if (!email.threadId) {
    // If it doesn't have a threadId for some reason, just show it
    uniqueThreads.push(email);
  }
}

// Get the displaying contact name for a thread in the inbox list
const getThreadAgentName = (item) => {
  const threadMsgs = emails.filter((e) => e.threadId && e.threadId === item.threadId);
  const agentInThread =
    agents.find((a) =>
      threadMsgs.some((m) => m.senderEmail === a.email || m.receiver === a.email)
    ) || agents.find((a) => a.email === item.receiver || a.id === item.agentId);

  const isLastEmailFromUser =
    item.senderEmail === currentUser.email ||
    item.sender === currentUser.name ||
    item.role === "Founder";

  if (isLastEmailFromUser && agentInThread) {
    return agentInThread.name;
  }
  return item.sender;
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
            FOUNDER HARNESS 1998 TRINITRON CRT MONITOR — EXECUTIVE OS v4.2
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-pixel transition-all cursor-pointer ${activeApp === "email"
                  ? "bg-[#1c49b0] text-white border border-[#0d2a70] shadow-inner font-bold"
                  : "bg-[#3980f4]/60 text-slate-100 hover:bg-[#3980f4]"
                }`}
            >
              <Mail className="size-3.5 text-amber-300" />
              <span>FounderMail XP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveApp("tasks")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-pixel transition-all cursor-pointer ${activeApp === "tasks"
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
                FounderMail XP
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
                    `FounderMail XP v4.2 — ${currentUser.name} Executive Inbox`}
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
              {/* APP 1: FOUNDERMAIL XP (EMAIL CLIENT TO ALL AGENTS) */}
              {activeApp === "email" && (
                <div className="h-full flex flex-col lg:flex-row gap-3 overflow-hidden">
                  {/* Left: Email Inbox List */}
                  <div className="w-full lg:w-80 bg-white border border-[#7f9db9] rounded p-2 flex flex-col shrink-0 overflow-y-auto">
                    <div className="font-pixel text-[11px] text-[#0055ea] font-bold border-b border-[#7f9db9] pb-1.5 mb-2 flex items-center justify-between">
                      <span>📥 AGENT INBOX ({uniqueThreads.length})</span>
                      <span className="text-[9px] text-slate-500">
                        Live Threads
                      </span>
                    </div>

                    <div className="space-y-1.5 overflow-y-auto flex-1">
                      {uniqueThreads.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center h-40">
                          <Mail className="size-8 text-slate-300 mb-2 opacity-60" />
                          <p className="font-bold text-slate-700">Inbox Empty</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Enter an agent email below to compose your first email thread!
                          </p>
                        </div>
                      ) : (
                        uniqueThreads.map((item) => {
                          const isSelected = item.threadId ? selectedEmail?.threadId === item.threadId : item.id === selectedEmailId;
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => {
                                playRetroSound("click");
                                setSelectedEmailId(item.id);
                                setShowForm(false);
                              }}
                              className={`w-full text-left p-2 rounded border cursor-pointer transition-all ${isSelected
                                  ? "bg-[#316ac5] text-white border-[#1c49b0] shadow"
                                  : "bg-[#f8f9fa] hover:bg-[#ece9d8] text-[#222] border-[#ccd]"
                                }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold gap-1">
                                <span className="truncate">{getThreadAgentName(item)}</span>
                                <span
                                  className={`shrink-0 text-[9px] ${isSelected
                                      ? "text-amber-200"
                                      : "text-slate-500"
                                    }`}
                                >
                                  {formatEmailDate(item.createdAt)} • {item.time}
                                </span>
                              </div>
                              <div
                                className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-slate-100 font-bold" : "text-[#555]"
                                  }`}
                              >
                                {item.subject}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right: Email Detail View & Send Message Box */}
                  <div className="flex-1 bg-white border border-[#7f9db9] rounded p-3 flex flex-col overflow-hidden relative">
                    {/* Top Right Compose Button */}
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        type="button"
                        onClick={handleComposeClick}
                        className="bg-[#0055ea] hover:bg-[#0047bf] text-white font-pixel text-xs px-3 py-1.5 rounded border border-[#003da6] shadow cursor-pointer font-bold flex items-center gap-1"
                      >
                        <FileText className="size-3.5" />
                        <span>COMPOSE</span>
                      </button>
                    </div>

                    {selectedEmail ? (
                      <>
                        {/* Email Header */}
                        <div className="border-b border-[#7f9db9] pb-2 mb-2 pr-28">
                          <div className="flex items-center justify-between">
                            <h4 className="font-pixel text-xs text-[#0055ea] font-bold">
                              {selectedEmail.subject}
                            </h4>
                          </div>
                          <div className="text-[11px] text-slate-700 mt-1 font-bold flex flex-wrap justify-between gap-1 items-center">
                            <div>
                              Thread:{" "}
                              <span className="text-slate-500 text-[10px]">
                                {emails.filter(e => e.threadId === selectedEmail.threadId).length} messages
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-500 font-bold">
                                Latest: {formatEmailDate(selectedEmail.createdAt)} at {selectedEmail.time}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Reading Pane - Thread View */}
                        <div className="flex-1 bg-[#fdfdfd] border border-[#eee] p-3 rounded text-xs text-slate-800 font-mono overflow-y-auto mb-3 shadow-inner relative space-y-4">
                          {emails
                            .filter(e => e.threadId === selectedEmail.threadId)
                            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                            .map((msg, index) => {
                              const isMe = !msg.isSenderAgent;
                              
                              return (
                                <div key={msg.id} className={`p-3 rounded border ${isMe ? 'bg-[#f0f4f9] border-[#0055ea]/30 ml-8' : 'bg-white border-slate-200 mr-8'}`}>
                                  <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
                                    <div>
                                      <div className={`font-bold text-[11px] ${isMe ? 'text-[#0055ea]' : 'text-slate-700'}`}>
                                        {msg.sender}
                                      </div>
                                      <div className="text-[9px] text-slate-400">To: {msg.receiver}</div>
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-bold text-right">
                                      {formatEmailDate(msg.createdAt)}<br/>{msg.time}
                                    </div>
                                  </div>
                                  <div className="whitespace-pre-line leading-relaxed text-[11px]">
                                    {msg.body}
                                  </div>
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600 font-bold flex items-center gap-1.5">
                                      <Paperclip className="size-3 text-[#0055ea]" />
                                      <span className="text-[#0055ea] font-mono">
                                        {msg.attachments.join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          }

                          {!showForm && (
                            <div className="mt-6 pt-2">
                              <button
                                type="button"
                                onClick={handleReplyClick}
                                className="bg-[#f0f4f9] hover:bg-[#e1e9f4] text-[#0055ea] font-pixel text-xs px-3 py-1.5 rounded border border-[#7f9db9] shadow cursor-pointer font-bold flex items-center gap-1"
                              >
                                <Send className="size-3.5" />
                                <span>REPLY</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 bg-[#fdfdfd] border border-[#eee] p-6 rounded text-xs text-slate-400 font-mono flex flex-col items-center justify-center text-center mb-3">
                        <Mail className="size-10 text-slate-300 mb-2" />
                        <p className="font-pixel text-xs text-slate-600 font-bold">NO THREAD SELECTED</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                          Click Compose to start a new email thread!
                        </p>
                      </div>
                    )}

                    {/* Notification Toast */}
                    {sentNotification && (
                      <div className="bg-emerald-100 border border-emerald-500 text-emerald-800 text-xs p-2 rounded mb-2 font-pixel font-bold">
                        ✓ {sentNotification}
                      </div>
                    )}

                    {/* Compose Email Form with Agent Email Autocomplete */}
                    {showForm && (
                      <form
                        onSubmit={emailSubject.startsWith("Re:") ? handleReplyEmail : handleSendEmail}
                        className="bg-[#f0f4f9] border border-[#7f9db9] p-2.5 rounded space-y-2 relative"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-pixel text-[10px] text-[#0055ea] font-bold">
                            {emailSubject.startsWith("Re:") ? "REPLY MESSAGE" : "NEW MESSAGE"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="text-slate-500 hover:text-red-500 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs relative">
                          <span className="font-bold text-slate-700 font-pixel shrink-0">
                            To (Agent):
                          </span>

                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={recipientEmail}
                              onFocus={() => setShowSuggestions(true)}
                              onChange={(e) => {
                                setRecipientEmail(e.target.value);
                                setShowSuggestions(true);
                              }}
                              placeholder="Type agent email (e.g. victor.stone@foundersharness.ai)..."
                              className="w-full bg-white border border-[#7f9db9] px-2 py-1 text-xs rounded text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
                            />

                            {/* Auto-complete suggestions dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                              <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border-2 border-[#0055ea] rounded shadow-2xl z-50 max-h-48 overflow-y-auto">
                                <div className="px-2 py-1 bg-[#ece9d8] border-b text-[10px] font-pixel text-[#0055ea] font-bold">
                                  AGENT EMAIL SUGGESTIONS ({suggestions.length})
                                </div>
                                {suggestions.map((agent) => (
                                  <button
                                    type="button"
                                    key={agent.id}
                                    onMouseDown={() => {
                                      setRecipientEmail(agent.email || `${agent.id}@foundersharness.ai`);
                                      setSelectedAgentId(agent.id);
                                      setShowSuggestions(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-[#316ac5] hover:text-white text-xs border-b border-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                                  >
                                    <div>
                                      <span className="font-bold">{agent.name}</span>{" "}
                                      <span className="text-[10px] opacity-80">&lt;{agent.email}&gt;</span>
                                    </div>
                                    <span className="text-[9px] opacity-70 font-mono">{agent.officeRole.split(" ")[0]}</span>
                                  </button>
                                ))}

                                <button
                                  type="button"
                                  onMouseDown={() => {
                                    setRecipientEmail("all.agents@foundersharness.ai");
                                    setSelectedAgentId("all");
                                    setShowSuggestions(false);
                                  }}
                                  className="w-full text-left px-2 py-1.5 bg-amber-50 hover:bg-amber-500 hover:text-white text-xs font-bold text-amber-800 flex items-center justify-between cursor-pointer transition-colors"
                                >
                                  <span>📢 BROADCAST TO ALL AGENTS</span>
                                  <span className="text-[9px] font-mono">&lt;all.agents@foundersharness.ai&gt;</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Subject (e.g. Execute LinkedIn batch / Crawl VC credits)"
                          className="w-full bg-white border border-[#7f9db9] px-2 py-1 text-xs rounded text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />

                        <input
                          type="text"
                          value={emailAttachments}
                          onChange={(e) => setEmailAttachments(e.target.value)}
                          placeholder="Attachments (comma separated files/links, e.g. spec.pdf, mockup.png)"
                          className="w-full bg-white border border-[#7f9db9] px-2 py-1 text-xs rounded text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />

                        <div className="flex items-center gap-2">
                          <textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            placeholder="Write instruction email body..."
                            rows={2}
                            className="flex-1 bg-white border border-[#7f9db9] p-2 text-xs rounded text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none"
                          />
                          <button
                            type="submit"
                            disabled={!emailBody.trim() || !recipientEmail.trim()}
                            className="bg-[#0055ea] hover:bg-[#0047bf] text-white font-pixel text-xs px-4 py-3 rounded border border-[#003da6] shadow cursor-pointer font-bold disabled:opacity-50 flex items-center gap-1 shrink-0"
                          >
                            <Send className="size-3.5" />
                            <span>SEND MAIL</span>
                          </button>
                        </div>
                      </form>
                    )}
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
                                {agent.harnessDomain}
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
                            🏆 {agent.achievementScore} Pts
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              playRetroSound("click");
                              setActiveApp("email");
                              setRecipientEmail(agent.email || `${agent.id}@foundersharness.ai`);
                              setSelectedAgentId(agent.id);
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
                    defaultValue={`FOUNDER HARNESS ROADMAP & DAY PLAN:\n\n1. Social Media: Sophia & Lucas batch 14 posts via CDP browser session.\n2. Grants & Capital: Victor crawling NSF & SBIR non-dilutive grants.\n3. Focus Time: Samuel protecting 4-hour deep work coding block.\n4. Events & Safety: Roman & Tyler checking local demo nights and API rate limits.`}
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
