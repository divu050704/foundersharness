"use client";

import { useState } from "react";
import { Send, Award, Coffee, Terminal } from "lucide-react";
import PixelHumanFigure from "./PixelHumanFigure";
import { playRetroSound } from "@/lib/retroAudio";

export default function RightAgentPanel({ agent, onUpdateAgent, onDispatchTask }) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(agent?.aiModel || "Orchestrator Core");

  if (!agent) {
    return (
      <div className="bg-[#eee8d5] border-l-4 border-[#b58900] p-6 text-center font-mono text-[#586e75] flex flex-col items-center justify-center h-full">
        <Terminal className="size-8 text-[#93a1a1] mb-2" />
        <p className="font-pixel text-xs text-[#073642]">NO AGENT SELECTED</p>
        <p className="text-[10px] text-[#586e75] mt-1">Select any agent from the floor or bottom dock</p>
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

  const handleRewardAchievement = () => {
    playRetroSound("chime");
    onUpdateAgent(agent.id, {
      achievementScore: agent.achievementScore + 50,
      logs: [
        ...agent.logs,
        `[ACHIEVEMENT] Received +50 Achievement points from Founder! New score: ${agent.achievementScore + 50}`
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
    <div className="bg-[#eee8d5] border-l-4 border-[#b58900] flex flex-col h-full font-mono text-[#073642] shadow-2xl select-none">
      
      {/* Header Profile Section */}
      <div className="p-4 border-b border-[#b58900]/40 bg-[#fdf6e3] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PixelHumanFigure agentId={agent.id} size="md" isWorking={isWorking} />
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

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-pixel text-sm text-[#073642] font-bold">{agent.name}</h3>
              {agent.id === "alex" && <span title="God Agent Presiding">👑</span>}
            </div>
            <p className="text-[11px] text-[#586e75] font-bold">{agent.officeRole}</p>
            <span className="text-[9px] font-pixel text-[#b58900] bg-[#b58900]/10 border border-[#b58900]/40 px-1.5 py-0.5 rounded mt-1 inline-block font-bold">
              {agent.harnessDomain || agent.aiModel}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="p-2.5 bg-[#eee8d5] border-b border-[#b58900]/30 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRewardAchievement}
            className="flex items-center gap-1 bg-[#b58900] text-[#fdf6e3] border border-[#b58900] hover:bg-[#a17a00] px-2 py-1 rounded font-pixel text-[9px] cursor-pointer font-bold"
          >
            <Award className="size-3" />
            <span>+50 Achievement</span>
          </button>

          <button
            type="button"
            onClick={handleGiveCoffee}
            className="flex items-center gap-1 bg-[#cb4b16]/20 text-[#cb4b16] border border-[#cb4b16]/50 hover:bg-[#cb4b16]/30 px-2 py-1 rounded font-pixel text-[9px] cursor-pointer font-bold"
          >
            <Coffee className="size-3" />
            <span>Coffee ☕ ({agent.coffeeCups})</span>
          </button>
        </div>

        <select
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          className="bg-[#fdf6e3] border border-[#b58900]/50 rounded text-[10px] px-2 py-1 font-mono text-[#073642] font-bold focus:outline-none focus:border-[#cb4b16] cursor-pointer"
        >
          <option value="Orchestrator Core">Orchestrator Core</option>
          <option value="High Performance Core">High Performance Core</option>
          <option value="Fast Execution Core">Fast Execution Core</option>
          <option value="Logic & Verification Core">Logic & Verification Core</option>
          <option value="Safety & Compliance Core">Safety & Compliance Core</option>
        </select>
      </div>

      {/* Active Task & Thought Banner */}
      <div className="p-3 bg-[#fdf6e3] border-b border-[#b58900]/30 space-y-1">
        <div className="text-[10px] text-[#586e75] uppercase font-bold flex items-center justify-between">
          <span>Active Harness Task</span>
          <span className="text-[#cb4b16] font-pixel text-[9px] font-bold">{agent.status.toUpperCase()}</span>
        </div>
        <p className="text-xs text-[#073642] font-bold bg-[#eee8d5] p-2 rounded border border-[#b58900]/40 truncate font-mono">
          {agent.activeTask}
        </p>
      </div>

      {/* Live Agent Terminal Log Stream */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-[10px] text-[#cb4b16] font-bold flex items-center gap-1.5">
            <Terminal className="size-3.5" /> AGENT TERMINAL OUTPUT
          </span>
          <span className="text-[9px] text-[#586e75] font-bold">Live Stream</span>
        </div>

        <div className="flex-1 bg-[#073642] text-[#859900] p-3 rounded-lg border border-[#268bd2] font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1.5 shadow-inner">
          {agent.logs.map((log, idx) => (
            <div key={idx} className="break-words">
              <span className="text-[#93a1a1] mr-1.5">[{new Date().toLocaleTimeString()}]</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Task Dispatch Box */}
      <div className="p-3 bg-[#fdf6e3] border-t border-[#b58900]/30">
        <form onSubmit={handleSendPrompt} className="flex items-center gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={`Command ${agent.name.split(" ")[0]}...`}
            className="flex-1 bg-[#eee8d5] border border-[#b58900]/50 px-3 py-2 text-xs rounded text-[#073642] font-bold placeholder:text-[#586e75] focus:outline-none focus:border-[#cb4b16]"
          />
          <button
            type="submit"
            disabled={!customPrompt.trim()}
            className="bg-[#cb4b16] hover:bg-[#a33b11] text-[#fdf6e3] font-pixel text-[9px] px-3 py-2 rounded border border-[#cb4b16] flex items-center gap-1 cursor-pointer font-bold disabled:opacity-50"
          >
            <Send className="size-3" />
            <span>Dispatch</span>
          </button>
        </form>
      </div>

    </div>
  );
}
