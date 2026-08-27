"use client";

import { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import PixelHumanFigure from "./PixelHumanFigure";
import { playRetroSound } from "@/lib/retroAudio";

export default function BottomAgentDock({ agents, selectedAgentId, onSelectAgent }) {
  const scrollRef = useRef(null);

  // Auto scroll selected agent card into view in horizontal bar
  useEffect(() => {
    if (selectedAgentId && scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector(`[data-agent-id="${selectedAgentId}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [selectedAgentId]);

  return (
    <div className="bg-[#eee8d5] border-t-4 border-[#b58900] p-2.5 shadow-2xl font-mono text-[#073642] select-none">
      
      {/* Dock Bar Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-[#cb4b16] uppercase tracking-wider flex items-center gap-1.5 font-bold">
            <span>👥</span> LOCAL AGENT FLEET DOCK ({agents.length})
          </span>
          <span className="bg-[#b58900]/20 text-[#b58900] border border-[#b58900]/40 text-[9px] px-2 py-0.5 rounded font-pixel font-bold">
            ● REALTIME TOP-VIEW CAMERA TRACKING ACTIVE
          </span>
        </div>

        <span className="text-[10px] text-[#586e75] hidden sm:inline-block font-bold">
          Click any agent below to center & follow them with top-view camera 🎥
        </span>
      </div>

      {/* Horizontal Scrollable Agent Strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-1.5 px-1 scrollbar-thin scrollbar-thumb-[#b58900]"
      >
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const isWorking = agent.status === "working" || agent.status === "thinking";

          return (
            <button
              type="button"
              key={agent.id}
              data-agent-id={agent.id}
              onClick={() => {
                playRetroSound("click");
                onSelectAgent(agent);
              }}
              className={`relative flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all shrink-0 select-none text-left ${
                isSelected
                  ? "bg-[#fdf6e3] border-[#cb4b16] ring-2 ring-[#cb4b16]/60 shadow-xl scale-[1.02] z-20"
                  : "bg-[#fdf6e3]/80 border-[#d3cbb7] hover:border-[#b58900] hover:bg-[#fdf6e3]"
              }`}
            >
              {/* Camera Tracking Active Badge */}
              {isSelected && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#cb4b16] text-[#fdf6e3] text-[8px] font-pixel px-2 py-0.5 rounded-full font-bold shadow-md flex items-center gap-1 whitespace-nowrap animate-bounce">
                  <Camera className="size-2.5" />
                  <span>TRACKING 🎥</span>
                </div>
              )}

              {/* Character Avatar Sprite */}
              <div className="relative shrink-0">
                <PixelHumanFigure agentId={agent.id} size="sm" isWorking={isWorking} />
                <span
                  className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#fdf6e3] ${
                    agent.status === "working"
                      ? "bg-[#859900] animate-pulse"
                      : agent.status === "thinking"
                      ? "bg-[#268bd2] animate-ping"
                      : "bg-[#93a1a1]"
                  }`}
                />
              </div>

              {/* Agent Title & Details */}
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h5 className="font-pixel text-xs text-[#073642] font-bold truncate max-w-[110px]">
                    {agent.name.split(" ")[0]}
                  </h5>
                  {agent.id === "michael" && <span className="text-[10px]">👑</span>}
                </div>

                <p className="text-[10px] text-[#586e75] truncate max-w-[120px]">
                  {agent.officeRole.split(" ")[0]}
                </p>

                {/* Bottom Meta Pill */}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[9px] font-pixel px-1.5 py-0.2 rounded border bg-[#eee8d5] border-[#b58900]/40 text-[#b58900] font-bold">
                    {agent.aiModel.split(" ")[0]}
                  </span>
                  <span className="text-[9px] text-[#586e75] flex items-center gap-0.5 font-bold">
                    ☕ x{agent.coffeeCups}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
