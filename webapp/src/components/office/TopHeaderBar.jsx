"use client";

import { Brain, Award, MessageSquare, Coffee, Volume2, VolumeX, Monitor, Sparkles, Send, Terminal } from "lucide-react";
import { playRetroSound, isAudioEnabled, toggleAudio } from "@/lib/retroAudio";

export default function TopHeaderBar({
  onOpenMemory,
  onOpenConference,
  onOpenDundies,
  onTriggerCoffee,
  onDispatchTask
}) {
  return (
    <div className="bg-[#141a22] border-b-4 border-[#2e3e50] p-3 px-4 shadow-xl font-mono text-slate-100 flex flex-wrap items-center justify-between gap-3 crt-overlay select-none">
      
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="size-8 rounded bg-[#f59e0b]/20 border border-[#f59e0b] flex items-center justify-center font-pixel text-[#f59e0b] text-xs shadow">
          MD
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-pixel text-xs text-white uppercase tracking-wide">
              MUNDER DIFFLIN HQ
            </h1>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-vt323">
              ● 8 AGENTS ONLINE
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Local Multi-Agent Harness & AI Office Floor
          </p>
        </div>
      </div>

      {/* Center Top Controls (Knowledge, Memory, Conference, Dundies) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playRetroSound("click");
            onOpenMemory();
          }}
          className="flex items-center gap-1.5 bg-[#24303e] hover:bg-[#2c3b4e] text-amber-400 border border-[#2e3e50] px-3 py-1.5 rounded font-pixel text-[9px] transition-all cursor-pointer shadow"
        >
          <Brain className="size-3.5" />
          <span>Knowledge & Memory 🧠</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playRetroSound("blip");
            onOpenConference();
          }}
          className="flex items-center gap-1.5 bg-[#24303e] hover:bg-[#2c3b4e] text-cyan-400 border border-[#2e3e50] px-3 py-1.5 rounded font-pixel text-[9px] transition-all cursor-pointer shadow"
        >
          <MessageSquare className="size-3.5" />
          <span>Conference Room 🗣️</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playRetroSound("chime");
            onOpenDundies();
          }}
          className="flex items-center gap-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 px-3 py-1.5 rounded font-pixel text-[9px] transition-all cursor-pointer font-bold shadow"
        >
          <Award className="size-3.5" />
          <span>Dundie Awards 🏆</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playRetroSound("coffee");
            onTriggerCoffee();
          }}
          className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 px-3 py-1.5 rounded font-pixel text-[9px] transition-all cursor-pointer"
        >
          <Coffee className="size-3.5" />
          <span>Coffee Break ☕</span>
        </button>
      </div>

      {/* Right Sound & CRT Filter Toggles */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const current = isAudioEnabled();
            toggleAudio(!current);
          }}
          className="bg-[#18202a] hover:bg-[#24303e] text-slate-300 border border-[#2e3e50] px-2.5 py-1 rounded text-xs font-mono cursor-pointer flex items-center gap-1"
          title="Toggle 8-Bit Audio"
        >
          {isAudioEnabled() ? <Volume2 className="size-3.5 text-emerald-400" /> : <VolumeX className="size-3.5 text-slate-500" />}
          <span className="text-[10px]">{isAudioEnabled() ? "SFX ON" : "SFX OFF"}</span>
        </button>
      </div>

    </div>
  );
}
