"use client";

import { useState } from "react";
import { Send, Share2, DollarSign, Calendar, Users, Monitor, Sparkles, Coffee, Terminal } from "lucide-react";
import { playRetroSound } from "@/lib/retroAudio";

export default function GodAgentBar({ onDispatchTask, onTriggerPreset }) {
  const [prompt, setPrompt] = useState("");
  const [targetAgent, setTargetAgent] = useState("all");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    playRetroSound("click");
    onDispatchTask({ prompt, targetAgent });
    setPrompt("");
  };

  const presets = [
    { label: "Build Social Calendar 📱", icon: Share2, preset: "social", text: "Build 7-day social media content calendar and queue posts for autonomous browser publishing" },
    { label: "Find Grants & VCs 💰", icon: DollarSign, preset: "capital", text: "Search non-dilutive startup grants, AWS/GCP credits packages, and investor leads" },
    { label: "Plan Founder Day 📅", icon: Calendar, preset: "planner", text: "Organize founder daily tasks, block 4 hours of deep focus time, and optimize calendar" },
    { label: "Find Local Meetups 🤝", icon: Users, preset: "meetups", text: "Crawl local tech events, startup pitch competitions, demo days, and VC networking socials" },
    { label: "Browser Session Check 🌐", icon: Monitor, preset: "browser", text: "Ping device-hook browser helper and verify Playwright CDP session status" }
  ];

  return (
    <div className="bg-[#141a22] border-2 border-[#2e3e50] p-3 rounded-lg shadow-lg relative overflow-hidden font-mono text-slate-100 select-none">
      {/* Top Banner Accent */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#2e3e50] pb-2.5 mb-2.5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded bg-[#f59e0b]/20 border border-[#f59e0b] flex items-center justify-center font-pixel text-[#f59e0b] text-xs shadow">
            MS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs text-[#f59e0b] uppercase tracking-wide">
                FOUNDER HARNESS GOD DISPATCHER (Michael Scott)
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-vt323 tracking-wider uppercase animate-pulse">
                ● Live & Connected to Backend
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Automating founder social posts, grant discovery, day planning & meetup crawling.
            </p>
          </div>
        </div>

        {/* Quick Founder Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.preset}
              type="button"
              onClick={() => {
                playRetroSound("blip");
                onTriggerPreset(p);
              }}
              className="flex items-center gap-1 text-[10px] bg-[#18202a] hover:bg-[#24303e] text-slate-200 px-2 py-1 rounded border border-[#2e3e50] transition-all cursor-pointer font-medium"
              title={p.text}
            >
              <p.icon className="size-3 text-[#f59e0b]" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2">
        <select
          value={targetAgent}
          onChange={(e) => setTargetAgent(e.target.value)}
          className="bg-[#0f1419] border border-[#2e3e50] text-xs px-2.5 py-2 rounded font-mono text-white focus:outline-none focus:border-[#f59e0b] cursor-pointer w-full sm:w-auto"
        >
          <option value="all">⚡ Broadcast to All Agents</option>
          <option value="michael">Michael (Chief Co-pilot)</option>
          <option value="pam">Pam (Social Calendar Builder)</option>
          <option value="jim">Jim (Device-Hook Browser Poster)</option>
          <option value="dwight">Dwight (Grants & VC Scout)</option>
          <option value="stanley">Stanley (Day Planner & Focus)</option>
          <option value="ryan">Ryan (Meetup & Events Scout)</option>
          <option value="toby">Toby (Safety & Rate Limits)</option>
          <option value="angela">Angela (Budget Auditor)</option>
        </select>

        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type command for Founder Harness (e.g. 'Build 7-day social posts on AI and find $100K grants')..."
            className="w-full bg-[#0f1419] border border-[#2e3e50] px-3 py-2 text-xs font-mono rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f59e0b] pr-8"
          />
          <Terminal className="absolute right-2.5 top-2.5 size-3.5 text-slate-500 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={!prompt.trim()}
          className="w-full sm:w-auto bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-pixel text-[9px] px-4 py-2 rounded border border-[#f59e0b] flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 uppercase font-bold"
        >
          <Send className="size-3" />
          <span>Dispatch Task</span>
        </button>
      </form>
    </div>
  );
}
