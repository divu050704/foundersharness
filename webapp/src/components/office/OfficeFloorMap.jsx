"use client";

import { useState } from "react";
import { Coffee, Award, MessageSquare, Terminal, Share2, DollarSign, Calendar, Users, Monitor, ShieldCheck, CheckCircle2 } from "lucide-react";
import PixelHumanFigure from "./PixelHumanFigure";
import { playRetroSound } from "@/lib/retroAudio";

export default function OfficeFloorMap({ agents, selectedAgentId, onSelectAgent, onOpenConference, onTriggerCoffee, onOpenDundies }) {
  const [hoveredAgent, setHoveredAgent] = useState(null);

  const getAgentById = (id) => agents.find((a) => a.id === id);

  const getStatusBadge = (status) => {
    switch (status) {
      case "working":
        return { text: "WORKING", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500", dot: "bg-emerald-500 animate-pulse" };
      case "thinking":
        return { text: "THINKING", bg: "bg-cyan-500/20 text-cyan-400 border-cyan-500", dot: "bg-cyan-400 animate-ping" };
      case "meeting":
        return { text: "MEETING", bg: "bg-amber-500/20 text-amber-400 border-amber-500", dot: "bg-amber-400" };
      case "idle":
        return { text: "IDLE", bg: "bg-slate-500/20 text-slate-400 border-slate-500", dot: "bg-slate-400" };
      default:
        return { text: "OFFLINE", bg: "bg-red-500/20 text-red-400 border-red-500", dot: "bg-red-500" };
    }
  };

  const RenderDesk = ({ agentId, isBoss = false, domainBadge }) => {
    const agent = getAgentById(agentId);
    if (!agent) return null;
    const badge = getStatusBadge(agent.status);
    const isSelected = selectedAgentId === agent.id;
    const isHovered = hoveredAgent === agentId;
    const isWorking = agent.status === "working" || agent.status === "thinking";

    return (
      <div
        onClick={() => {
          playRetroSound("click");
          onSelectAgent(agent);
        }}
        onMouseEnter={() => setHoveredAgent(agentId)}
        onMouseLeave={() => setHoveredAgent(null)}
        className={`relative group cursor-pointer transition-all duration-200 p-3 rounded-lg border-2 select-none ${
          isSelected
            ? "bg-[#24303e] border-[#f59e0b] ring-2 ring-[#f59e0b]/50 shadow-xl shadow-[#f59e0b]/20"
            : isBoss
            ? "bg-amber-950/20 border-amber-500/80 hover:border-amber-400 shadow-xl shadow-amber-950/50"
            : "bg-[#18202a] border-[#2e3e50] hover:border-[#f59e0b] shadow-md"
        } ${isHovered ? "scale-[1.03] z-30" : "z-10"}`}
      >
        {/* Floating Speech / Thought Bubble */}
        {agent.currentThought && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap animate-float-speech">
            <div className="bg-[#0f1419] text-[#f3f4f6] text-[10px] font-mono px-2 py-0.5 rounded border border-[#f59e0b] shadow-lg flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              <span className="truncate max-w-[190px]">{agent.currentThought}</span>
            </div>
            <div className="w-1.5 h-1.5 bg-[#0f1419] border-r border-b border-[#f59e0b] rotate-45 mx-auto -mt-1" />
          </div>
        )}

        {/* Desk Header / Human Figure & Status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            {/* Human Pixel Character Sprite */}
            <PixelHumanFigure agentId={agent.id} size="md" isWorking={isWorking} />

            <div className="overflow-hidden">
              <h4 className="text-xs font-bold font-mono tracking-tight text-white flex items-center gap-1">
                <span className="truncate">{agent.name}</span>
                {isBoss && <span title="Chief Founder Co-pilot">👑</span>}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                {agent.officeRole}
              </p>
            </div>
          </div>

          <span className={`text-[8px] font-pixel px-1.5 py-0.5 rounded border flex items-center gap-1 ${badge.bg}`}>
            <span className={`size-1.5 rounded-full ${badge.dot}`} />
            {badge.text}
          </span>
        </div>

        {/* Workstation Desk Illustration */}
        <div className="relative h-20 w-full bg-[#0f1419]/90 rounded border border-[#2e3e50] p-2 flex flex-col justify-between overflow-hidden group-hover:border-[#f59e0b]/50 transition-colors">
          {/* CRT Monitor & Domain Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-6 bg-slate-950 rounded border border-slate-700 p-0.5 flex flex-col justify-between shadow-inner">
                <div className="w-full h-1 bg-emerald-400/90 rounded-[1px] animate-pulse" />
                <div className="w-2/3 h-1 bg-cyan-400/90 rounded-[1px]" />
                <div className="w-1/2 h-1 bg-amber-400/90 rounded-[1px]" />
              </div>
              <span className="text-[9px] font-pixel text-[#f59e0b] truncate max-w-[110px]">
                {domainBadge || agent.aiModel.split(" ")[0]}
              </span>
            </div>

            {/* Coffee Cups counter */}
            <div className="flex items-center gap-1" title={`${agent.coffeeCups} Coffee Cups Today`}>
              <span className="text-xs">☕</span>
              <span className="text-[9px] font-vt323 text-slate-400">
                x{agent.coffeeCups}
              </span>
            </div>
          </div>

          {/* Active Task Snippet */}
          <div className="text-[10px] font-mono bg-[#18202a] px-1.5 py-0.5 rounded border border-[#2e3e50] text-slate-200 truncate flex items-center justify-between">
            <span className="truncate max-w-[150px]">{agent.activeTask}</span>
            <Terminal className="size-3 text-[#f59e0b] shrink-0 ml-1" />
          </div>
        </div>

        {/* Footer Dundie Points & Domain */}
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>{agent.harnessDomain?.split(" ")[0]}</span>
          <span className="text-[#f59e0b] font-bold flex items-center gap-0.5">
            🏆 {agent.dundieScore} Pts
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-[#0c0f12] p-4 rounded-lg overflow-y-auto font-mono text-slate-100 h-full">
      
      {/* 2D Office Layout Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ROOM 1: Manager's Executive Suite (Michael Scott) */}
        <div className="lg:col-span-4 bg-amber-950/20 border-2 border-amber-500/50 rounded-lg p-3 relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 border-b border-amber-500/30 pb-1.5">
            <span className="font-pixel text-[10px] text-amber-400 flex items-center gap-1.5">
              👑 FOUNDER CHIEF EXECUTIVE SUITE
            </span>
            <span className="text-[9px] font-mono text-amber-300/80">Master Co-pilot</span>
          </div>

          <RenderDesk agentId="michael" isBoss={true} domainBadge="👑 Orchestrator" />

          <div className="mt-3 bg-[#0f1419]/90 border border-amber-500/40 p-2 rounded text-[10px] text-amber-300/90 flex items-center justify-between">
            <span>☕ Founder Coffee Station</span>
            <span className="font-bold">Dispatch Mic 🎙️</span>
          </div>
        </div>

        {/* ROOM 2: Breakroom & Recreation Amenities */}
        <div className="lg:col-span-8 bg-[#141a22] border-2 border-[#2e3e50] rounded-lg p-3 relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 border-b border-[#2e3e50] pb-1.5">
            <span className="font-pixel text-[10px] text-[#f59e0b] flex items-center gap-1.5">
              ☕ THE BREAKROOM & RECREATION LOUNGE
            </span>
            <span className="text-[9px] font-mono text-slate-400">Click Amenities for Founder Events</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Coffee Maker */}
            <div
              onClick={() => {
                playRetroSound("coffee");
                onTriggerCoffee();
              }}
              className="bg-[#18202a] border border-[#2e3e50] p-2.5 rounded text-center cursor-pointer hover:border-amber-500 transition-all group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">☕</div>
              <div className="font-mono text-[10px] font-bold text-white">Espresso Machine</div>
              <div className="text-[9px] text-emerald-400">Brewing Dark Roast</div>
            </div>

            {/* Arcade Cabinet */}
            <div
              onClick={() => playRetroSound("chime")}
              className="bg-[#18202a] border border-[#2e3e50] p-2.5 rounded text-center cursor-pointer hover:border-purple-500 transition-all group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🕹️</div>
              <div className="font-mono text-[10px] font-bold text-white">Frogger Arcade</div>
              <div className="text-[9px] text-purple-400">High Score: 99,400</div>
            </div>

            {/* Water Cooler */}
            <div
              onClick={() => playRetroSound("blip")}
              className="bg-[#18202a] border border-[#2e3e50] p-2.5 rounded text-center cursor-pointer hover:border-cyan-500 transition-all group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💧</div>
              <div className="font-mono text-[10px] font-bold text-white">Water Cooler</div>
              <div className="text-[9px] text-cyan-400">Startup Gossip Hub</div>
            </div>

            {/* Dundie Display Shelf */}
            <div
              onClick={() => {
                playRetroSound("chime");
                onOpenDundies();
              }}
              className="bg-[#18202a] border border-[#2e3e50] p-2.5 rounded text-center cursor-pointer hover:border-amber-400 transition-all group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏆</div>
              <div className="font-mono text-[10px] font-bold text-white">Dundie Trophy Case</div>
              <div className="text-[9px] text-amber-400">8 Trophies Active</div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Social Media & Growth Pod (Pam & Jim) */}
        <div className="lg:col-span-6 bg-[#141a22] border-2 border-[#2e3e50] rounded-lg p-3.5 relative">
          <div className="flex items-center justify-between mb-3 border-b border-[#2e3e50] pb-1.5">
            <span className="font-pixel text-[10px] text-pink-400 flex items-center gap-1.5">
              📱 SOCIAL MEDIA & BROWSER AUTOMATION POD
            </span>
            <span className="text-[9px] font-mono text-slate-400">Content Calendar & Device-Hook Poster</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <RenderDesk agentId="pam" domainBadge="📱 Calendar Builder" />
            <RenderDesk agentId="jim" domainBadge="🌐 Browser Poster" />
          </div>
        </div>

        {/* SECTION 4: Capital, Grants & Day Planning Suite (Dwight & Stanley) */}
        <div className="lg:col-span-6 bg-[#141a22] border-2 border-[#2e3e50] rounded-lg p-3.5 relative">
          <div className="flex items-center justify-between mb-3 border-b border-[#2e3e50] pb-1.5">
            <span className="font-pixel text-[10px] text-emerald-400 flex items-center gap-1.5">
              💰 CAPITAL, GRANTS & DAY PLANNER SUITE
            </span>
            <span className="text-[9px] font-mono text-slate-400">Grants, AWS Credits & Focus Time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <RenderDesk agentId="dwight" domainBadge="💰 Grants & VCs" />
            <RenderDesk agentId="stanley" domainBadge="📅 Day Planner" />
          </div>
        </div>

        {/* SECTION 5: Meetups, HR & Accounting Wing (Ryan, Toby, Angela) */}
        <div className="lg:col-span-12 bg-[#141a22] border-2 border-[#2e3e50] rounded-lg p-3.5 relative">
          <div className="flex items-center justify-between mb-3 border-b border-[#2e3e50] pb-1.5">
            <span className="font-pixel text-[10px] text-purple-400 flex items-center gap-1.5">
              🤝 MEETUPS, SAFETY & FINANCIAL AUDIT WING
            </span>
            <span className="text-[9px] font-mono text-slate-400">Tech Events, Rate Limits & Token Billing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <RenderDesk agentId="ryan" domainBadge="🤝 Meetup Scout" />
            <RenderDesk agentId="toby" domainBadge="🛡️ Rate Limits" />
            <RenderDesk agentId="angela" domainBadge="📊 SaaS Billing" />
          </div>
        </div>

        {/* SECTION 6: Conference Room (Oval Mahogany Table) */}
        <div className="lg:col-span-12 bg-[#141a22] border-2 border-[#2e3e50] rounded-lg p-3.5 relative">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🗣️</div>
              <div>
                <h4 className="font-pixel text-xs text-amber-400">
                  CONFERENCE ROOM A — FOUNDER STRATEGY & PEER REVIEW TABLE
                </h4>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Assemble Michael, Dwight, Jim, Pam, Stanley & Ryan around the mahogany table to debate startup strategy, social campaigns & grant applications.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playRetroSound("blip");
                onOpenConference();
              }}
              className="w-full sm:w-auto bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-pixel text-[10px] px-4 py-2.5 rounded border border-[#f59e0b] transition-all cursor-pointer font-bold whitespace-nowrap uppercase"
            >
              Enter Conference Room 🗣️
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
