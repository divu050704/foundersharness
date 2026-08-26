"use client";

import { useState } from "react";
import { X, Play, RefreshCw, MessageSquare, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { playRetroSound } from "@/lib/retroAudio";

export default function ConferenceRoomModal({ agents, onClose }) {
  const [topic, setTopic] = useState("Sprint Architecture & Codebase Refactor Strategy");
  const [isSimulating, setIsSimulating] = useState(false);
  const [transcript, setTranscript] = useState([
    { speaker: "Michael Scott", text: "Welcome everyone to Conference Room A! Today we are discussing our next big multi-agent release.", time: "10:00 AM", color: "text-amber-500" },
    { speaker: "Dwight Schrute", text: "Question: Have all unit tests passed with 100% coverage before this meeting was called?", time: "10:01 AM", color: "text-emerald-500" },
    { speaker: "Jim Halpert", text: "(Looks at camera) Yes Dwight. I pushed clean Zustand stores and optimized re-renders 5 minutes ago.", time: "10:02 AM", color: "text-cyan-400" },
    { speaker: "Pam Beesly", text: "The UI design now strictly uses the Dunder Mifflin pixel theme and custom retro typography.", time: "10:03 AM", color: "text-pink-400" },
    { speaker: "Stanley Hudson", text: "Is this meeting going to delay Pretzel Day? My SQL vector queries are already running.", time: "10:04 AM", color: "text-blue-400" },
    { speaker: "Toby Flenderson", text: "Just making sure we stay within API rate limit compliance...", time: "10:05 AM", color: "text-slate-400" }
  ]);

  const handleStartSimulation = () => {
    setIsSimulating(true);
    playRetroSound("blip");

    const simLines = [
      { speaker: "Michael Scott", text: "That's what I'm talking about! Exceptional teamwork. Dwight, issue Dundie awards to everyone!", color: "text-amber-500" },
      { speaker: "Dwight Schrute", text: "Understood Manager Michael! Awarding +50 Dundie points to all engineering subagents.", color: "text-emerald-500" },
      { speaker: "Angela Martin", text: "Token cost estimate for this meeting: $0.02. Approved.", color: "text-red-400" },
      { speaker: "Ryan Howard", text: "Wuphf.com integration is ready whenever we spin up the Solana devnet.", color: "text-purple-400" }
    ];

    simLines.forEach((line, idx) => {
      setTimeout(() => {
        playRetroSound("typewriter");
        setTranscript((prev) => [
          ...prev,
          { ...line, time: new Date().toLocaleTimeString() }
        ]);
        if (idx === simLines.length - 1) {
          setIsSimulating(false);
          playRetroSound("chime");
        }
      }, (idx + 1) * 1200);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border-4 border-border w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-amber-950/40 border-b border-amber-600/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded bg-amber-500/20 border border-amber-500 flex items-center justify-center text-xl shadow">
              🗣️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-sm text-amber-500">CONFERENCE ROOM A</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-vt323 uppercase">
                  Session Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Multi-Agent Architecture Sync & Peer Review Table
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playRetroSound("click");
              onClose();
            }}
            className="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Conference Room Table Graphic */}
        <div className="p-4 bg-[#181310] border-b border-border text-center relative overflow-hidden">
          <div className="text-[10px] font-pixel text-amber-500/80 mb-2 uppercase">
            Mahogany Oval Conference Table
          </div>
          
          {/* Seated Avatars Grid */}
          <div className="flex flex-wrap items-center justify-center gap-3 py-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex flex-col items-center gap-1 bg-secondary/60 border border-border p-2 rounded w-20 shadow-sm"
              >
                <div className={`size-7 rounded flex items-center justify-center font-pixel text-xs border ${agent.avatarBg}`}>
                  {agent.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <span className="text-[9px] font-mono truncate max-w-full text-foreground">
                  {agent.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Conversation Transcript */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5 max-h-[300px] bg-background">
          {transcript.map((item, idx) => (
            <div key={idx} className="bg-secondary/40 border border-border p-2.5 rounded text-xs leading-relaxed">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`font-pixel text-[10px] ${item.color}`}>
                  {item.speaker}
                </span>
                <span className="text-[10px] text-muted-foreground">{item.time}</span>
              </div>
              <p className="text-foreground font-mono">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Modal Controls */}
        <div className="bg-card border-t border-border p-3 flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span>AI Consensus Protocol: Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartSimulation}
              disabled={isSimulating}
              className="bg-primary text-primary-foreground font-pixel text-[9px] px-4 py-2 rounded border border-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Debating...</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  <span>Simulate Agent Turn</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
