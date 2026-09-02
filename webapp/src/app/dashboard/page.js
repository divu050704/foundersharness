"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { INITIAL_AGENTS } from "@/lib/officeAgents";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import TopHeaderBar from "@/components/office/TopHeaderBar";
import OfficeFloorMap from "@/components/office/OfficeFloorMap";
import RightAgentPanel from "@/components/office/RightAgentPanel";
import BottomAgentDock from "@/components/office/BottomAgentDock";
import MemoryKnowledgeModal from "@/components/office/MemoryKnowledgeModal";
import ConferenceRoomModal from "@/components/office/ConferenceRoomModal";
import AchievementTracker from "@/components/office/AchievementTracker";
import ExecutiveCoPilotModal from "@/components/office/ExecutiveCoPilotModal";
import { playRetroSound } from "@/lib/retroAudio";

export default function DedicatedOfficeApp() {
  const router = useRouter();
  const [checkingUser, setCheckingUser] = useState(true);
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState(null); // Unlocked on page load
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isConferenceOpen, setIsConferenceOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isAlexOSOpen, setIsAlexOSOpen] = useState(false);

  // Verify Better Auth user session and hit /api/user to check user details status
  useEffect(() => {
    async function verifyUserSessionAndDetails() {
      try {
        let hasActiveSession = false;

        // 1. Verify user session via Better Auth client
        try {
          const sessionRes = await authClient.getSession();
          if (sessionRes?.data?.user || sessionRes?.data?.session) {
            hasActiveSession = true;
          }
        } catch (authErr) {
          console.warn("Better Auth session check warning:", authErr);
        }

        if (!hasActiveSession) {
          toast.error("Authentication required. Please sign in.");
          router.replace("/login");
          return;
        }

        // 2. Hit /api/user to check if user has entered onboarding details
        const res = await api.get("/api/user/status");
        if (res && res.exists === false) {
          router.replace("/onboarding");
          return;
        }
      } catch (err) {
        console.error("Error hitting /api/user or verifying session:", err);
        router.replace("/login");
        return;
      } finally {
        setCheckingUser(false);
      }
    }

    verifyUserSessionAndDetails();
  }, [router]);

  // Handle agent selection & trigger Alex Rivera Executive XP OS modal
  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    if (agent?.id === "alex") {
      playRetroSound("chime");
      setIsAlexOSOpen(true);
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

  // Achievement Point Reward
  const handleRewardAgent = (agentId) => {
    playRetroSound("chime");
    const agent = agents.find((a) => a.id === agentId);
    toast.success(`🏆 Awarded +50 Achievement Points to ${agent?.name}!`);
    handleUpdateAgent(agentId, {
      achievementScore: (agent?.achievementScore || 0) + 50
    });
  };

  if (checkingUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#fdf6e3] text-[#073642] font-mono select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-[#b58900]/30 border-t-[#cb4b16] animate-spin" />
          <p className="font-pixel text-xs text-[#073642] font-bold tracking-wider">
            VERIFYING FOUNDER DETAILS VIA /api/user...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fdf6e3] text-[#073642] font-mono overflow-hidden select-none">
      
      {/* 1. TOP HEADER BAR: Knowledge, Memory (MemPalace), Conference, Achievements & Audio */}
      <TopHeaderBar
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenConference={() => setIsConferenceOpen(true)}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
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
            onOpenAchievements={() => setIsAchievementsOpen(true)}
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

      {/* Modal 1: Alex Rivera 90s CRT Monitor Windows XP OS */}
      {isAlexOSOpen && (
        <ExecutiveCoPilotModal
          agents={agents}
          onClose={() => setIsAlexOSOpen(false)}
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

      {/* Modal 4: Achievement Awards Leaderboard */}
      {isAchievementsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-mono">
          <div className="w-full max-w-4xl">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setIsAchievementsOpen(false)}
                className="bg-[#24303e] text-white px-3 py-1 rounded font-pixel text-xs border border-[#2e3e50] cursor-pointer"
              >
                Close Achievement Hall ✕
              </button>
            </div>
            <AchievementTracker
              agents={agents}
              onRewardAgent={handleRewardAgent}
            />
          </div>
        </div>
      )}

    </div>
  );
}
