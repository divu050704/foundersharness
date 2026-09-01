"use client";

import { Brain, Award, MessageSquare, Coffee, Volume2, VolumeX } from "lucide-react";
import { playRetroSound, isAudioEnabled, toggleAudio } from "@/lib/retroAudio";

export default function TopHeaderBar({
  onOpenMemory,
  onOpenConference,
  onOpenDundies,
  onTriggerCoffee
}) {
  return (
    <div className="bg-[#eee8d5] border-b-4 border-[#b58900] p-3 px-4 shadow-xl font-mono text-[#073642] flex flex-wrap items-center justify-between gap-3 select-none">
      
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="size-8 rounded bg-[#b58900] border border-[#b58900] flex items-center justify-center font-pixel text-[#fdf6e3] text-xs font-bold shadow">
          FH
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-pixel text-xs text-[#073642] font-bold uppercase tracking-wide">
              FOUNDER HARNESS HQ
            </h1>
            <span className="bg-[#859900]/20 text-[#859900] border border-[#859900]/40 text-[9px] px-1.5 py-0.5 rounded font-pixel font-bold">
              ● 8 AGENTS ONLINE
            </span>
          </div>
          <p className="text-[10px] text-[#586e75] font-mono">
            Local Multi-Agent Harness & AI Office Floor (Solarized Light)
          </p>
        </div>
      </div>

      {/* Center Top Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playRetroSound("click");
            onOpenMemory();
          }}
          className="flex items-center gap-1.5 bg-[#fdf6e3] hover:bg-[#eee8d5] text-[#b58900] border border-[#b58900] px-3 py-1.5 rounded font-pixel text-[9px] font-bold transition-all cursor-pointer shadow"
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
          className="flex items-center gap-1.5 bg-[#fdf6e3] hover:bg-[#eee8d5] text-[#268bd2] border border-[#268bd2] px-3 py-1.5 rounded font-pixel text-[9px] font-bold transition-all cursor-pointer shadow"
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
          className="flex items-center gap-1.5 bg-[#b58900] hover:bg-[#a17a00] text-[#fdf6e3] px-3 py-1.5 rounded font-pixel text-[9px] transition-all cursor-pointer font-bold shadow"
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
          className="flex items-center gap-1.5 bg-[#cb4b16]/20 text-[#cb4b16] border border-[#cb4b16]/50 hover:bg-[#cb4b16]/30 px-3 py-1.5 rounded font-pixel text-[9px] font-bold transition-all cursor-pointer"
        >
          <Coffee className="size-3.5" />
          <span>Coffee Break ☕</span>
        </button>
      </div>

      {/* Right Sound & Audio Toggles */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const current = isAudioEnabled();
            toggleAudio(!current);
          }}
          className="bg-[#fdf6e3] hover:bg-[#eee8d5] text-[#073642] border border-[#b58900] px-2.5 py-1 rounded text-xs font-mono cursor-pointer flex items-center gap-1 font-bold"
          title="Toggle 8-Bit Audio"
        >
          {isAudioEnabled() ? <Volume2 className="size-3.5 text-[#859900]" /> : <VolumeX className="size-3.5 text-[#93a1a1]" />}
          <span className="text-[10px]">{isAudioEnabled() ? "SFX ON" : "SFX OFF"}</span>
        </button>
      </div>

    </div>
  );
}
