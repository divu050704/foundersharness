"use client";

import { useState } from "react";
import { toast } from "sonner";
import { INITIAL_AGENTS } from "@/lib/officeAgents";
import TopHeaderBar from "@/components/office/TopHeaderBar";
import OfficeFloorMap from "@/components/office/OfficeFloorMap";
import RightAgentPanel from "@/components/office/RightAgentPanel";
import BottomAgentDock from "@/components/office/BottomAgentDock";
import MemoryKnowledgeModal from "@/components/office/MemoryKnowledgeModal";
import ConferenceRoomModal from "@/components/office/ConferenceRoomModal";
import DundieTracker from "@/components/office/DundieTracker";
import MichaelScottOSModal from "@/components/office/MichaelScottOSModal";
import { playRetroSound } from "@/lib/retroAudio";

export default function DedicatedOfficeApp() {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState(null); // Unlocked on page load
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isConferenceOpen, setIsConferenceOpen] = useState(false);
  const [isDundiesOpen, setIsDundiesOpen] = useState(false);
  const [isMichaelOSOpen, setIsMichaelOSOpen] = useState(false);

  // Handle agent selection & trigger Michael Scott Executive XP OS modal
  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    if (agent?.id === "michael") {
      playRetroSound("chime");
      setIsMichaelOSOpen(true);
    }
  };

  // Update specific agent state
  const handleUpdateAgent = (agentId, updates) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, ...updates } : a))
    );
    if (selectedAgent && selectedAgent.id === agentId) {
      setSelectedAgent((prev) => ({ ...prev, ...updates }));
    }
  };

  // Dispatch task to specific or broadcast agent
  const handleDispatchTask = ({ prompt, targetAgent }) => {
    playRetroSound("blip");

    if (targetAgent === "all") {
      toast.success("Broadcasted instruction to all office floor agents!", {
        description: prompt
      });

      setAgents((prev) =>
        prev.map((agent) => ({
          ...agent,
          status: "working",
          activeTask: prompt,
          currentThought: `Executing: "${prompt.slice(0, 30)}..."`,
          logs: [
            ...agent.logs,
            `[BROADCAST] Received God Agent command: "${prompt}"`
          ]
        }))
      );
    } else {
      const target = agents.find((a) => a.id === targetAgent);
      toast.success(`Task dispatched to ${target?.name || targetAgent}!`, {
        description: prompt
      });

      handleUpdateAgent(targetAgent, {
        status: "working",
        activeTask: prompt,
        currentThought: `Executing: "${prompt.slice(0, 30)}..."`,
        logs: [
          ...(target?.logs || []),
          `[DIRECT TASK] Received prompt: "${prompt}"`
        ]
      });
    }
  };

  // Office-wide Coffee Break
  const handleOfficeCoffeeBreak = () => {
    playRetroSound("coffee");
    toast.success("☕ Office Coffee Break! All agents refreshed.");
    setAgents((prev) =>
      prev.map((a) => ({
        ...a,
        coffeeCups: a.coffeeCups + 1,
        status: "idle",
        currentThought: "Drinking espresso in the breakroom ☕",
        logs: [...a.logs, "[BREAKROOM] Coffee break enjoyed!"]
      }))
    );
  };

  // Dundie Point Reward
  const handleRewardAgent = (agentId) => {
    playRetroSound("chime");
    const agent = agents.find((a) => a.id === agentId);
    toast.success(`🏆 Awarded +50 Dundie Points to ${agent?.name}!`);
    handleUpdateAgent(agentId, {
      dundieScore: (agent?.dundieScore || 0) + 50
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fdf6e3] text-[#073642] font-mono overflow-hidden select-none">
      
      {/* 1. TOP HEADER BAR: Knowledge, Memory (MemPalace), Conference, Dundies & Audio */}
      <TopHeaderBar
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenConference={() => setIsConferenceOpen(true)}
        onOpenDundies={() => setIsDundiesOpen(true)}
        onTriggerCoffee={handleOfficeCoffeeBreak}
        onDispatchTask={handleDispatchTask}
      />

      {/* 2. CENTER CONTENT: Office Floor Canvas (Left) + Selected Agent Terminal (Right) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: 2D Interactive Office Floor Map with Human Pixel Figures */}
        <div className="flex-1 overflow-y-auto p-3 bg-[#fdf6e3]">
          <OfficeFloorMap
            agents={agents}
            selectedAgentId={selectedAgent?.id}
            onSelectAgent={handleSelectAgent}
            onOpenConference={() => setIsConferenceOpen(true)}
            onTriggerCoffee={handleOfficeCoffeeBreak}
            onOpenDundies={() => setIsDundiesOpen(true)}
          />
        </div>

        {/* Right: Selected Agent Status, Live Terminal Stream & Prompt Output Panel */}
        <div className="w-80 md:w-96 shrink-0 h-full overflow-hidden">
          <RightAgentPanel
            agent={selectedAgent}
            onUpdateAgent={handleUpdateAgent}
            onDispatchTask={handleDispatchTask}
          />
        </div>
      </div>

      {/* 3. BOTTOM DOCK BAR: All 8 Human-Like Pixel Agent Sprites */}
      <BottomAgentDock
        agents={agents}
        selectedAgentId={selectedAgent?.id}
        onSelectAgent={handleSelectAgent}
      />

      {/* Modal 1: Michael Scott 90s CRT Monitor Windows XP OS */}
      {isMichaelOSOpen && (
        <MichaelScottOSModal
          agents={agents}
          onClose={() => setIsMichaelOSOpen(false)}
          onDispatchTask={handleDispatchTask}
          onUpdateAgent={handleUpdateAgent}
        />
      )}

      {/* Modal 2: Memory & Knowledge Base (MemPalace) */}
      {isMemoryOpen && (
        <MemoryKnowledgeModal onClose={() => setIsMemoryOpen(false)} />
      )}

      {/* Modal 3: Conference Room Multi-Agent Debates */}
      {isConferenceOpen && (
        <ConferenceRoomModal
          agents={agents}
          onClose={() => setIsConferenceOpen(false)}
        />
      )}

      {/* Modal 4: Dundie Awards Leaderboard */}
      {isDundiesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-mono">
          <div className="w-full max-w-4xl">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setIsDundiesOpen(false)}
                className="bg-[#24303e] text-white px-3 py-1 rounded font-pixel text-xs border border-[#2e3e50] cursor-pointer"
              >
                Close Dundie Hall ✕
              </button>
            </div>
            <DundieTracker
              agents={agents}
              onRewardAgent={handleRewardAgent}
            />
          </div>
        </div>
      )}

    </div>
  );
}
