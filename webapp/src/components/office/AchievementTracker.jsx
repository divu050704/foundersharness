"use client";

import { Award, Trophy, Star, Zap, Sparkles } from "lucide-react";
import { playRetroSound } from "@/lib/retroAudio";

export default function AchievementTracker({ agents, onRewardAgent }) {
  // Sort agents by Achievement Score
  const sortedAgents = [...agents].sort((a, b) => b.achievementScore - a.achievementScore);
  const topAgent = sortedAgents[0];

  return (
    <div className="bg-card border-2 border-border p-4 rounded-lg shadow-md font-mono space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-500 font-pixel text-xs">
            🏆
          </div>
          <div>
            <h3 className="font-pixel text-xs text-foreground uppercase tracking-wide">
              Annual Achievement Awards Hall of Fame
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Recognizing extraordinary local agent performance & codebase contributions
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded">
          <Trophy className="size-4 text-amber-500" />
          <span className="font-pixel text-[10px] text-amber-500">
            Top Agent: {topAgent?.name}
          </span>
        </div>
      </div>

      {/* Leaderboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {sortedAgents.map((agent, rank) => (
          <div
            key={agent.id}
            onClick={() => {
              playRetroSound("chime");
              onRewardAgent(agent.id);
            }}
            className="bg-secondary/40 border border-border hover:border-amber-500/60 p-3 rounded-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[9px] text-muted-foreground">
                  #{rank + 1} {rank === 0 ? "👑" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "⭐"}
                </span>
                <span className="font-pixel text-[10px] text-amber-500 font-bold">
                  {agent.achievementScore} Pts
                </span>
              </div>

              <div className="flex items-center gap-2.5 mb-2">
                <div className={`size-7 rounded flex items-center justify-center font-pixel text-xs border ${agent.avatarBg}`}>
                  {agent.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="font-bold text-xs text-foreground group-hover:text-amber-400 transition-colors">
                    {agent.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {agent.harnessDomain}
                  </div>
                </div>
              </div>

              <div className="text-[10px] bg-background/80 px-2 py-1 rounded border border-border/60 text-amber-400/90 font-mono truncate">
                {agent.achievementTitle}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{agent.tasksCompleted} Tasks</span>
              <span className="text-emerald-500 font-bold group-hover:underline">
                +50 Pts 🏆
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
