"use client";

import { useState } from "react";
import { Send, Award, Coffee, Terminal, Brain, Cpu, CheckCircle2, ShieldCheck, Share2, DollarSign, Calendar, Users, Monitor } from "lucide-react";
import PixelHumanFigure from "./PixelHumanFigure";
import { playRetroSound } from "@/lib/retroAudio";

export default function RightAgentPanel({ agent, onUpdateAgent, onDispatchTask }) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(agent?.aiModel || "Claude 3.7 Sonnet");

  if (!agent) {
    return (
      <div className="bg-[#141a22] border-l-4 border-[#2e3e50] p-6 text-center font-mono text-slate-400 flex flex-col items-center justify-center h-full">
        <Terminal className="size-8 text-slate-600 mb-2" />
        <p className="font-pixel text-xs text-slate-300">NO AGENT SELECTED</p>
        <p className="text-[10px] text-slate-500 mt-1">Select any agent from the floor or bottom dock</p>
      </div>
    );
  }

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
        `[DUNDIE] Received +50 Dundie points from Founder! New score: ${agent.dundieScore + 50}`
      ]
    });
  };

  const handleGiveCoffee = () => {
    playRetroSound("coffee");
    onUpdateAgent(agent.id, {
      coffeeCups: agent.coffeeCups + 1,
      status: "working",
      currentThought: "Coffee received! Speeding up founder task execution ⚡",
      logs: [
        ...agent.logs,
        `[COFFEE] Gulp! Coffee count is now ${agent.coffeeCups + 1}. Energy refueled.`
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

  const isWorking = agent.status === "working" || agent.status === "thinking";

  return (
    <div className="bg-[#141a22] border-l-4 border-[#2e3e50] flex flex-col h-full font-mono text-slate-100 shadow-2xl crt-overlay select-none">
      
      {/* Header Profile Section */}
      <div className="p-4 border-b border-[#2e3e50] bg-[#18202a] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PixelHumanFigure agentId={agent.id} size="md" isWorking={isWorking} />
            <span
              className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#18202a] ${
                agent.status === "working"
                  ? "bg-emerald-400 animate-pulse"
                  : agent.status === "thinking"
                  ? "bg-cyan-400 animate-ping"
                  : "bg-slate-400"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-pixel text-sm text-white">{agent.name}</h3>
              {agent.id === "michael" && <span title="God Agent Presiding">👑</span>}
            </div>
            <p className="text-[11px] text-slate-400">{agent.officeRole}</p>
            <span className="text-[9px] font-pixel text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/40 px-1.5 py-0.5 rounded mt-1 inline-block">
              {agent.harnessDomain || agent.aiModel}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="p-2.5 bg-[#0f1419] border-b border-[#2e3e50] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRewardDundie}
            className="flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 px-2 py-1 rounded font-pixel text-[9px] cursor-pointer"
          >
            <Award className="size-3" />
            <span>+50 Dundie</span>
          </button>

          <button
            type="button"
            onClick={handleGiveCoffee}
            className="flex items-center gap-1 bg-[#24303e] hover:bg-[#2c3b4e] text-slate-200 border border-[#2e3e50] px-2 py-1 rounded font-pixel text-[9px] cursor-pointer"
          >
            <Coffee className="size-3" />
            <span>Coffee ☕ ({agent.coffeeCups})</span>
          </button>
        </div>

        <select
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          className="bg-[#141a22] border border-[#2e3e50] rounded text-[10px] px-2 py-1 font-mono text-slate-200 focus:outline-none focus:border-[#f59e0b] cursor-pointer"
        >
          <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet</option>
          <option value="Claude 3.5 Haiku">Claude 3.5 Haiku</option>
          <option value="Grok-3 (Strict Enforcement)">Grok-3</option>
          <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
          <option value="DeepSeek R1 (Logic Master)">DeepSeek R1</option>
          <option value="Llama 3.3 (Safety Checked)">Llama 3.3</option>
        </select>
      </div>

      {/* Active Task & Thought Banner */}
      <div className="p-3 bg-[#18202a] border-b border-[#2e3e50] space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Active Harness Task</span>
          <span className="text-[#f59e0b] font-pixel text-[9px]">{agent.status.toUpperCase()}</span>
        </div>
        <p className="text-xs text-white bg-[#0f1419] p-2 rounded border border-[#2e3e50] truncate font-mono">
          {agent.activeTask}
        </p>
      </div>

      {/* Live Agent Terminal Log Stream */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-[10px] text-[#f59e0b] flex items-center gap-1.5">
            <Terminal className="size-3.5" /> AGENT TERMINAL OUTPUT
          </span>
          <span className="text-[9px] text-slate-500">Live Backend Stream</span>
        </div>

        <div className="flex-1 bg-black/90 text-emerald-400 p-3 rounded-lg border border-emerald-900/60 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1.5 shadow-inner">
          {agent.logs.map((log, idx) => (
            <div key={idx} className="break-words">
              <span className="text-slate-500 mr-1.5">[{new Date().toLocaleTimeString()}]</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Task Dispatch Box */}
      <div className="p-3 bg-[#18202a] border-t border-[#2e3e50]">
        <form onSubmit={handleSendPrompt} className="flex items-center gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={`Command ${agent.name.split(" ")[0]}...`}
            className="flex-1 bg-[#0f1419] border border-[#2e3e50] px-3 py-2 text-xs rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f59e0b]"
          />
          <button
            type="submit"
            disabled={!customPrompt.trim()}
            className="bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-pixel text-[9px] px-3 py-2 rounded border border-[#f59e0b] flex items-center gap-1 cursor-pointer font-bold disabled:opacity-50"
          >
            <Send className="size-3" />
            <span>Dispatch</span>
          </button>
        </form>
      </div>

    </div>
  );
}
