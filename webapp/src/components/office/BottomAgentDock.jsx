"use client";

import PixelHumanFigure from "./PixelHumanFigure";
import { playRetroSound } from "@/lib/retroAudio";

export default function BottomAgentDock({ agents, selectedAgentId, onSelectAgent }) {
  return (
    <div className="bg-[#141a22] border-t-4 border-[#2e3e50] p-2.5 shadow-2xl font-mono text-slate-100 crt-overlay">
      <div className="flex items-center justify-between mb-1.5 px-2">
        <span className="font-pixel text-[9px] text-[#f59e0b] uppercase tracking-wider flex items-center gap-1.5">
          <span>👥</span> LOCAL AGENTS DOCK ({agents.length})
        </span>
        <span className="text-[10px] text-slate-400">Click any agent figure to inspect live CLI output</span>
      </div>

      {/* Horizontal Agent Sprites Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const isWorking = agent.status === "working" || agent.status === "thinking";

          return (
            <div
              key={agent.id}
              onClick={() => {
                playRetroSound("click");
                onSelectAgent(agent);
              }}
              className={`flex items-center gap-2.5 p-2 rounded-lg border-2 cursor-pointer transition-all shrink-0 select-none ${
                isSelected
                  ? "bg-[#24303e] border-[#f59e0b] shadow-lg shadow-[#f59e0b]/20 scale-[1.02]"
                  : "bg-[#18202a] border-[#2e3e50] hover:border-slate-400 hover:bg-[#202b38]"
              }`}
            >
              {/* Pixel Human Character Sprite */}
              <div className="relative">
                <PixelHumanFigure agentId={agent.id} size="sm" isWorking={isWorking} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-slate-950 ${
                    agent.status === "working"
                      ? "bg-emerald-400 animate-pulse"
                      : agent.status === "thinking"
                      ? "bg-cyan-400 animate-ping"
                      : "bg-slate-400"
                  }`}
                />
              </div>

              {/* Agent Title & Status Meta */}
              <div className="overflow-hidden">
                <div className="flex items-center gap-1">
                  <h5 className="font-pixel text-[10px] text-white truncate max-w-[90px]">
                    {agent.name.split(" ")[0]}
                  </h5>
                  {agent.id === "michael" && <span className="text-[9px]">👑</span>}
                </div>
                <p className="text-[9px] text-slate-400 truncate max-w-[100px]">
                  {agent.aiModel.split(" ")[0]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
