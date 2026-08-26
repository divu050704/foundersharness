"use client";

import { useState } from "react";
import { X, Send, Award, Coffee, Cpu, Terminal, Brain, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { playRetroSound } from "@/lib/retroAudio";

export default function AgentCardModal({ agent, onClose, onUpdateAgent, onDispatchTask }) {
  const [activeTab, setActiveTab] = useState("terminal"); // terminal, memory, stats
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(agent.aiModel);

  if (!agent) return null;

  const handleSendPrompt = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    playRetroSound("click");
    onDispatchTask({ prompt: customPrompt, targetAgent: agent.id });
    setCustomPrompt("");
  };

  const handleRewardDundie = () => {
    playRetroSound("chime");
    onUpdateAgent(agent.id, {
      dundieScore: agent.dundieScore + 50,
      logs: [
        ...agent.logs,
        `[DUNDIE] Received +50 Dundie points from Admin! New score: ${agent.dundieScore + 50}`
      ]
    });
  };

  const handleGiveCoffee = () => {
    playRetroSound("coffee");
    onUpdateAgent(agent.id, {
      coffeeCups: agent.coffeeCups + 1,
      status: "working",
      currentThought: "Coffee received! Speeding up execution ⚡",
      logs: [
        ...agent.logs,
        `[COFFEE] Gulp! Coffee count is now ${agent.coffeeCups + 1}. Feeling energized.`
      ]
    });
  };

  const handleModelChange = (newModel) => {
    setSelectedModel(newModel);
    playRetroSound("blip");
    onUpdateAgent(agent.id, {
      aiModel: newModel,
      logs: [
        ...agent.logs,
        `[MODEL] Switched AI model to ${newModel}`
      ]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border-4 border-border w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-secondary/90 border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded border-2 flex items-center justify-center font-pixel text-sm ${agent.avatarBg}`}>
              {agent.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-sm text-foreground">{agent.name}</h3>
                <span className="bg-primary/20 text-primary border border-primary/40 text-[9px] px-1.5 py-0.5 rounded uppercase font-vt323">
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{agent.officeRole}</p>
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

        {/* Quick Action Toolbar */}
        <div className="bg-background/80 border-b border-border p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRewardDundie}
              className="flex items-center gap-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30 px-2.5 py-1 rounded font-pixel text-[9px] cursor-pointer"
            >
              <Award className="size-3.5" />
              <span>+50 Dundie Pts</span>
            </button>

            <button
              type="button"
              onClick={handleGiveCoffee}
              className="flex items-center gap-1.5 bg-secondary hover:bg-accent text-foreground border border-border px-2.5 py-1 rounded font-pixel text-[9px] cursor-pointer"
            >
              <Coffee className="size-3.5" />
              <span>Give Coffee ☕ ({agent.coffeeCups})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-background border border-border rounded text-[11px] px-2 py-1 font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet</option>
              <option value="Claude 3.5 Haiku">Claude 3.5 Haiku</option>
              <option value="Grok-3 (Strict Enforcement)">Grok-3</option>
              <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
              <option value="DeepSeek R1 (Logic Master)">DeepSeek R1</option>
              <option value="Llama 3.3 (Safety Checked)">Llama 3.3</option>
            </select>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-border bg-card">
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`flex-1 py-2 text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "terminal"
                ? "border-primary text-primary bg-primary/10"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="size-3.5" />
            <span>Terminal Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("memory")}
            className={`flex-1 py-2 text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "memory"
                ? "border-primary text-primary bg-primary/10"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Brain className="size-3.5" />
            <span>MemPalace ({agent.memoryItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`flex-1 py-2 text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "stats"
                ? "border-primary text-primary bg-primary/10"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Award className="size-3.5" />
            <span>Stats & Dundie</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-[220px]">
          {activeTab === "terminal" && (
            <div className="space-y-2">
              <div className="bg-black/90 text-emerald-400 p-3 rounded border border-emerald-900/50 text-xs font-mono font-normal min-h-[160px] max-h-[260px] overflow-y-auto space-y-1 shadow-inner">
                {agent.logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "memory" && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">
                Agent Business Memory (MemPalace Context):
              </h4>
              <div className="space-y-1.5">
                {agent.memoryItems.map((mem, idx) => (
                  <div
                    key={idx}
                    className="bg-secondary/60 border border-border p-2.5 rounded text-xs flex items-start gap-2 text-foreground"
                  >
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{mem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/60 border border-border p-3 rounded">
                <div className="text-muted-foreground text-[10px] uppercase">Dundie Award Title</div>
                <div className="text-xs font-bold text-amber-500 mt-1">{agent.dundieTitle}</div>
              </div>

              <div className="bg-secondary/60 border border-border p-3 rounded">
                <div className="text-muted-foreground text-[10px] uppercase">Dundie Points</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">🏆 {agent.dundieScore} pts</div>
              </div>

              <div className="bg-secondary/60 border border-border p-3 rounded">
                <div className="text-muted-foreground text-[10px] uppercase">Tasks Completed</div>
                <div className="text-base font-bold text-foreground mt-0.5">{agent.tasksCompleted}</div>
              </div>

              <div className="bg-secondary/60 border border-border p-3 rounded">
                <div className="text-muted-foreground text-[10px] uppercase">Lines of Code</div>
                <div className="text-base font-bold text-primary mt-0.5">{agent.linesWritten.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* Direct Task Dispatch Footer */}
        <div className="bg-card border-t border-border p-3">
          <form onSubmit={handleSendPrompt} className="flex items-center gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={`Send custom instruction directly to ${agent.name}...`}
              className="flex-1 bg-background border border-border px-3 py-2 text-xs rounded focus:outline-none focus:border-primary text-foreground"
            />
            <button
              type="submit"
              disabled={!customPrompt.trim()}
              className="bg-primary text-primary-foreground font-pixel text-[9px] px-4 py-2 rounded border border-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="size-3" />
              <span>Send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
