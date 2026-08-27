"use client";

import { useState, useEffect, useRef } from "react";
import { Coffee, Camera, ZoomIn, ZoomOut, RotateCcw, Lock, Unlock } from "lucide-react";
import TopViewAgentSprite from "./TopViewAgentSprite";
import { playRetroSound } from "@/lib/retroAudio";

// Office Floor Map Dimensions
const MAP_WIDTH = 1400;
const MAP_HEIGHT = 900;

// Custom 2D Espresso Coffee Machine Graphic
function EspressoMachineGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12 overflow-visible shrink-0 drop-shadow-md" aria-hidden="true">
      {/* Stainless steel body */}
      <rect x="8" y="14" width="48" height="42" rx="4" fill="#586e75" stroke="#073642" strokeWidth="2" />
      <rect x="12" y="18" width="40" height="12" rx="2" fill="#073642" />

      {/* Pressure Gauge */}
      <circle cx="20" cy="24" r="3.5" fill="#fdf6e3" stroke="#b58900" strokeWidth="1" />
      <line x1="20" y1="24" x2="21.5" y2="22" stroke="#cb4b16" strokeWidth="1.5" />

      {/* Status LEDs */}
      <circle cx="32" cy="24" r="2" fill="#859900" className="animate-pulse" />
      <circle cx="38" cy="24" r="2" fill="#b58900" />
      <circle cx="44" cy="24" r="2" fill="#cb4b16" />

      {/* Coffee Beans Hopper Top */}
      <rect x="20" y="4" width="24" height="10" rx="2" fill="#b58900" stroke="#073642" strokeWidth="1.5" />
      <ellipse cx="28" cy="9" rx="2" ry="3" fill="#451a03" />
      <ellipse cx="36" cy="9" rx="2" ry="3" fill="#451a03" />

      {/* Dual Portafilter Group Heads */}
      <rect x="18" y="30" width="8" height="8" fill="#93a1a1" stroke="#073642" strokeWidth="1" />
      <rect x="38" y="30" width="8" height="8" fill="#93a1a1" stroke="#073642" strokeWidth="1" />
      <line x1="26" y1="34" x2="30" y2="34" stroke="#073642" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="34" x2="50" y2="34" stroke="#073642" strokeWidth="2" strokeLinecap="round" />

      {/* Drip Tray */}
      <rect x="12" y="46" width="40" height="6" rx="1" fill="#073642" />
      <path d="M 14 49 H 50" stroke="#93a1a1" strokeWidth="1" strokeDasharray="2 2" />

      {/* Espresso Mug on Tray */}
      <rect x="20" y="42" width="6" height="5" rx="1" fill="#cb4b16" />
      <path d="M 22 40 Q 23 37 24 35" stroke="#fdf6e3" strokeWidth="1.5" fill="none" opacity="0.9" className="animate-pulse" />
    </svg>
  );
}

// Custom 2D Water Dispenser Machine Graphic
function WaterCoolerGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12 overflow-visible shrink-0 drop-shadow-md" aria-hidden="true">
      {/* Clear Blue Water Bottle on Top */}
      <path d="M 22 18 C 22 6, 42 6, 42 18 L 40 24 L 24 24 Z" fill="#2aa198" fillOpacity="0.75" stroke="#268bd2" strokeWidth="1.5" />
      {/* Water Level & Air Bubbles */}
      <ellipse cx="32" cy="14" rx="7" ry="3" fill="#268bd2" fillOpacity="0.6" />
      <circle cx="28" cy="18" r="1.5" fill="#fdf6e3" className="animate-ping" />
      <circle cx="35" cy="12" r="1" fill="#fdf6e3" className="animate-bounce" />

      {/* Bottle Neck Connector */}
      <rect x="26" y="24" width="12" height="4" fill="#073642" />

      {/* Dispenser Cabinet Body */}
      <rect x="18" y="28" width="28" height="32" rx="3" fill="#eee8d5" stroke="#073642" strokeWidth="2" />

      {/* Dispenser Alcove */}
      <rect x="22" y="34" width="20" height="16" rx="2" fill="#073642" />

      {/* Hot & Cold Taps */}
      <circle cx="27" cy="38" r="2.5" fill="#dc322f" />
      <circle cx="37" cy="38" r="2.5" fill="#268bd2" />

      {/* Drip Tray & Cup */}
      <rect x="24" y="47" width="16" height="2" fill="#93a1a1" />
      <rect x="30" y="44" width="4" height="4" rx="0.5" fill="#fdf6e3" />

      {/* Side Cup Dispenser Stack */}
      <rect x="46" y="32" width="4" height="18" rx="1" fill="#93a1a1" stroke="#073642" strokeWidth="1" />
    </svg>
  );
}

// Agent Home Desk Coordinates & Door Waypoints
const AGENT_LOCATIONS = {
  michael: {
    home: { x: 180, y: 150 },
    chair: { x: 180, y: 110 },
    door: { x: 230, y: 340 }
  },
  pam: {
    home: { x: 140, y: 680 },
    chair: { x: 140, y: 730 },
    door: { x: 230, y: 500 }
  },
  jim: {
    home: { x: 300, y: 680 },
    chair: { x: 300, y: 730 },
    door: { x: 230, y: 500 }
  },
  dwight: {
    home: { x: 560, y: 680 },
    chair: { x: 560, y: 730 },
    door: { x: 680, y: 500 }
  },
  stanley: {
    home: { x: 720, y: 680 },
    chair: { x: 720, y: 730 },
    door: { x: 680, y: 500 }
  },
  ryan: {
    home: { x: 1000, y: 610 },
    chair: { x: 1000, y: 560 },
    door: { x: 1110, y: 500 }
  },
  toby: {
    home: { x: 1000, y: 760 },
    chair: { x: 1000, y: 810 },
    door: { x: 1110, y: 500 }
  },
  angela: {
    home: { x: 1240, y: 680 },
    chair: { x: 1240, y: 730 },
    door: { x: 1110, y: 500 }
  }
};

// Common Pantry Waypoints
const PANTRY_WAYPOINTS = {
  pantryDoor: { x: 1110, y: 340 },
  coffeeMachine: { x: 1260, y: 110 }
};

// Build path to coffee machine from agent desk
function buildPathToCoffee(agentId) {
  const loc = AGENT_LOCATIONS[agentId];
  if (!loc) return [];
  return [
    { x: loc.home.x, y: loc.home.y },
    { x: loc.door.x, y: loc.door.y },
    { x: loc.door.x, y: 400 },
    { x: PANTRY_WAYPOINTS.pantryDoor.x, y: 400 },
    { x: PANTRY_WAYPOINTS.pantryDoor.x, y: PANTRY_WAYPOINTS.pantryDoor.y },
    { x: PANTRY_WAYPOINTS.coffeeMachine.x, y: PANTRY_WAYPOINTS.coffeeMachine.y }
  ];
}

export default function TopViewOfficeFloor({
  agents,
  selectedAgentId,
  onSelectAgent,
  onOpenConference,
  onTriggerCoffee
}) {
  const containerRef = useRef(null);

  // Real-time position & motion state for each agent
  const [agentMotions, setAgentMotions] = useState(() => {
    const initial = {};
    agents.forEach((a) => {
      const loc = AGENT_LOCATIONS[a.id] || { home: { x: 700, y: 450 } };
      initial[a.id] = {
        x: loc.home.x,
        y: loc.home.y,
        facingDir: "front",
        motionState: "at_desk",
        path: [],
        pathIdx: 0,
        hasCoffee: false,
        pantryTimer: 0,
        thought: ""
      };
    });
    return initial;
  });

  // Camera viewport transform state (Start unlocked on page load)
  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    zoom: 0.85,
    isLocked: false
  });

  // Drag pan state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cameraStartRef = useRef({ x: 0, y: 0 });

  // Trigger coffee walk for free agents
  const triggerAgentCoffeeRun = (agentId) => {
    setAgentMotions((prev) => {
      const curr = prev[agentId];
      if (!curr || curr.motionState !== "at_desk") return prev;
      const path = buildPathToCoffee(agentId);
      return {
        ...prev,
        [agentId]: {
          ...curr,
          motionState: "walking_to_coffee",
          path,
          pathIdx: 0,
          hasCoffee: false,
          thought: "Heading to breakroom for coffee ☕"
        }
      };
    });
  };

  // Trigger coffee for all free agents periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const freeAgents = agents.filter(
        (a) => a.status === "idle" || a.status === "thinking"
      );
      if (freeAgents.length > 0) {
        const randomAgent = freeAgents[Math.floor(Math.random() * freeAgents.length)];
        triggerAgentCoffeeRun(randomAgent.id);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [agents]);

  // Animation loop for agent movement
  useEffect(() => {
    let animFrame;
    const speed = 3.2;

    const updateMotions = () => {
      setAgentMotions((prev) => {
        let changed = false;
        const next = { ...prev };

        Object.keys(next).forEach((id) => {
          const m = { ...next[id] };

          if (m.motionState === "walking_to_coffee" || m.motionState === "walking_to_desk") {
            if (!m.path || m.path.length === 0) return;
            const target = m.path[m.pathIdx];
            if (!target) return;

            const dx = target.x - m.x;
            const dy = target.y - m.y;
            const dist = Math.hypot(dx, dy);

            if (dist < speed) {
              m.x = target.x;
              m.y = target.y;

              if (m.pathIdx < m.path.length - 1) {
                m.pathIdx += 1;
              } else {
                if (m.motionState === "walking_to_coffee") {
                  m.motionState = "at_pantry";
                  m.pantryTimer = 220;
                  m.hasCoffee = true;
                  m.thought = "Brewing espresso & chatting ☕";
                  playRetroSound("coffee");
                } else if (m.motionState === "walking_to_desk") {
                  m.motionState = "at_desk";
                  m.thought = "";
                  m.facingDir = "front";
                }
              }
            } else {
              m.x += (dx / dist) * speed;
              m.y += (dy / dist) * speed;

              if (dx < -0.5) {
                m.facingDir = "left";
              } else if (dx > 0.5) {
                m.facingDir = "right";
              } else {
                m.facingDir = "front";
              }
            }
            changed = true;
            next[id] = m;
          } else if (m.motionState === "at_pantry") {
            m.pantryTimer -= 1;
            if (m.pantryTimer <= 0) {
              const returnPath = [...buildPathToCoffee(id)].reverse();
              m.motionState = "walking_to_desk";
              m.path = returnPath;
              m.pathIdx = 0;
              m.thought = "Returning to desk with coffee ☕";
            }
            changed = true;
            next[id] = m;
          }
        });

        return changed ? next : prev;
      });

      animFrame = requestAnimationFrame(updateMotions);
    };

    animFrame = requestAnimationFrame(updateMotions);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Camera tracking loop for selected agent
  useEffect(() => {
    if (!camera.isLocked || !selectedAgentId || !containerRef.current) return;

    let camFrame;

    const followCamera = () => {
      const selectedMotion = agentMotions[selectedAgentId];
      if (selectedMotion && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewW = rect.width;
        const viewH = rect.height;

        const targetCamX = viewW / 2 - selectedMotion.x * camera.zoom;
        const targetCamY = viewH / 2 - selectedMotion.y * camera.zoom;

        setCamera((prev) => ({
          ...prev,
          x: prev.x + (targetCamX - prev.x) * 0.1,
          y: prev.y + (targetCamY - prev.y) * 0.1
        }));
      }

      camFrame = requestAnimationFrame(followCamera);
    };

    camFrame = requestAnimationFrame(followCamera);
    return () => cancelAnimationFrame(camFrame);
  }, [selectedAgentId, camera.isLocked, camera.zoom, agentMotions]);

  // Initial Auto-Fit Zoom & Center Office Floor on Page Load
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewW = rect.width;
      const viewH = rect.height;

      // Fit 1400x900 office floor in container viewport with padding & generous zoom
      const scaleX = (viewW - 24) / MAP_WIDTH;
      const scaleY = (viewH - 24) / MAP_HEIGHT;
      const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.65), 1.3);

      const initialTargetX = (viewW - MAP_WIDTH * fitZoom) / 2;
      const initialTargetY = (viewH - MAP_HEIGHT * fitZoom) / 2;

      setCamera({
        x: initialTargetX,
        y: initialTargetY,
        zoom: fitZoom,
        isLocked: false // Start unlocked
      });
    }
  }, []);

  // Manual Drag Pan Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    cameraStartRef.current = { x: camera.x, y: camera.y };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCamera((prev) => ({
      ...prev,
      x: cameraStartRef.current.x + dx,
      y: cameraStartRef.current.y + dy,
      isLocked: false
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleResetCameraFit = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewW = rect.width;
      const viewH = rect.height;

      const scaleX = (viewW - 24) / MAP_WIDTH;
      const scaleY = (viewH - 24) / MAP_HEIGHT;
      const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.65), 1.3);

      const initialTargetX = (viewW - MAP_WIDTH * fitZoom) / 2;
      const initialTargetY = (viewH - MAP_HEIGHT * fitZoom) / 2;

      setCamera({
        x: initialTargetX,
        y: initialTargetY,
        zoom: fitZoom,
        isLocked: false
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-[#fdf6e3] rounded-lg overflow-hidden border-2 border-[#b58900]/40 shadow-2xl font-mono select-none">
      
      {/* SOLARIZED CAMERA OVERLAY CONTROLS BAR */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2 bg-[#eee8d5]/95 backdrop-blur-md p-2 rounded-lg border-2 border-[#b58900] shadow-xl text-xs text-[#073642]">
        
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#fdf6e3] rounded border border-[#b58900]/40">
          <Camera className="size-3.5 text-[#cb4b16] animate-pulse" />
          <span className="font-pixel text-[10px] text-[#073642] font-bold">
            {camera.isLocked && selectedAgent
              ? `CAMERA TRACKING: ${selectedAgent.name.toUpperCase()} 🎥`
              : "FREE LOOK CAMERA 🌐"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playRetroSound("click");
            setCamera((prev) => ({ ...prev, isLocked: !prev.isLocked }));
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-pixel transition-all cursor-pointer font-bold ${
            camera.isLocked
              ? "bg-[#cb4b16] text-[#fdf6e3] border border-[#cb4b16]"
              : "bg-[#fdf6e3] text-[#073642] border border-[#b58900] hover:bg-[#eee8d5]"
          }`}
          title="Toggle camera follow lock"
        >
          {camera.isLocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
          <span>{camera.isLocked ? "LOCKED TO AGENT" : "FREE LOOK"}</span>
        </button>

        <div className="flex items-center gap-1 bg-[#fdf6e3] rounded p-0.5 border border-[#b58900]/40">
          <button
            type="button"
            onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.min(1.5, prev.zoom + 0.15) }))}
            className="p-1 hover:bg-[#eee8d5] text-[#073642] rounded cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <span className="text-[9px] text-[#586e75] px-1 font-mono font-bold">{Math.round(camera.zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.15) }))}
            className="p-1 hover:bg-[#eee8d5] text-[#073642] rounded cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetCameraFit}
            className="p-1 hover:bg-[#eee8d5] text-[#cb4b16] rounded cursor-pointer border-l border-[#b58900]/40"
            title="Auto-Fit Office Floor"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            playRetroSound("coffee");
            onTriggerCoffee();
            agents.forEach((a) => {
              triggerAgentCoffeeRun(a.id);
            });
          }}
          className="flex items-center gap-1 bg-[#b58900] hover:bg-[#a17a00] text-[#fdf6e3] px-2.5 py-1 rounded font-pixel text-[10px] font-bold cursor-pointer transition-all shadow"
        >
          <Coffee className="size-3.5" />
          <span>ALL AGENTS COFFEE RUN ☕</span>
        </button>
      </div>

      {/* VIEWPORT CANVAS CONTAINER */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative"
      >
        {/* 2D OFFICE FLOOR PLAN TRANSFORM WRAPPER */}
        <div
          className="absolute origin-top-left transition-transform duration-75 ease-out"
          style={{
            width: `${MAP_WIDTH}px`,
            height: `${MAP_HEIGHT}px`,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`
          }}
        >
          {/* SOLARIZED LIGHT CHESSBOARD FLOOR */}
          <div className="absolute inset-0 bg-[#fdf6e3] rounded-lg shadow-inner overflow-hidden">
            <svg className="w-full h-full opacity-90 pointer-events-none" aria-hidden="true">
              <defs>
                <pattern id="chessboard-floor" width="80" height="80" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="#fdf6e3" />
                  <rect x="40" width="40" height="40" fill="#eee8d5" />
                  <rect y="40" width="40" height="40" fill="#eee8d5" />
                  <rect x="40" y="40" width="40" height="40" fill="#fdf6e3" />
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#d3cbb7" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#chessboard-floor)" />
            </svg>
          </div>

          {/* ROOM 1: EXECUTIVE SUITE */}
          <div className="absolute left-[40px] top-[40px] w-[360px] h-[300px] rounded-lg border-4 border-[#b58900] bg-[#fdf6e3]/90 p-3 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-2 border-[#b58900] pb-1">
              <span className="font-pixel text-[10px] text-[#b58900] font-bold flex items-center gap-1">
                👑 EXECUTIVE SUITE — MICHAEL SCOTT
              </span>
              <span className="text-[9px] text-[#586e75] font-mono">Master Orchestrator</span>
            </div>

            <div className="relative flex items-center justify-center my-auto">
              <div className="absolute w-44 h-32 bg-[#eee8d5] border-2 border-[#b58900]/40 rounded-xl" />
              <div className="absolute top-[80px] w-12 h-10 bg-[#073642] border-2 border-[#586e75] rounded-full flex items-center justify-center shadow">
                <div className="w-8 h-4 bg-[#cb4b16] rounded-t-sm" />
              </div>
              <div className="relative w-40 h-20 bg-[#6c3b10] border-2 border-[#451a03] rounded-md p-2 shadow-xl flex items-center justify-between">
                <div className="w-10 h-7 bg-[#073642] rounded border border-[#268bd2] p-0.5 shadow-inner">
                  <div className="w-full h-1 bg-[#268bd2] rounded-[1px] animate-pulse" />
                  <div className="w-2/3 h-1 bg-[#859900] rounded-[1px] mt-1" />
                </div>
                <div className="w-8 h-5 bg-[#eee8d5] rounded border border-[#b58900] p-0.5 flex flex-col justify-between">
                  <div className="w-full h-0.5 bg-[#cb4b16]" />
                </div>
                <div className="text-xs">☕</div>
              </div>
            </div>

            <div className="text-[9px] text-[#b58900] font-mono text-center bg-[#eee8d5] py-0.5 rounded border border-[#b58900]/40 font-bold">
              Cabinet Door 🚪 (South)
            </div>
          </div>

          {/* ROOM 2: CONFERENCE ROOM A */}
          <button
            type="button"
            onClick={() => {
              playRetroSound("blip");
              onOpenConference();
            }}
            className="absolute left-[440px] top-[40px] w-[480px] h-[300px] rounded-lg border-4 border-[#268bd2] bg-[#fdf6e3]/90 p-3 shadow-xl flex flex-col justify-between cursor-pointer hover:border-[#2aa198] transition-colors text-left group"
          >
            <div className="flex items-center justify-between border-b-2 border-[#268bd2] pb-1 group-hover:border-[#2aa198] w-full">
              <span className="font-pixel text-[10px] text-[#268bd2] font-bold flex items-center gap-1">
                🗣️ CONFERENCE ROOM A — STRATEGY & DEBATES
              </span>
              <span className="text-[9px] text-[#586e75] font-mono">Click to Enter Debate ↗</span>
            </div>

            <div className="relative flex items-center justify-center my-auto w-full">
              <div className="w-[300px] h-[110px] bg-[#8b4513] border-4 border-[#451a03] rounded-[60px] p-3 shadow-xl flex items-center justify-around">
                <div className="text-center font-pixel text-[10px] text-[#fdf6e3] font-bold">
                  MAHOGANY STRATEGY TABLE
                </div>
              </div>
              <div className="absolute -top-4 left-16 w-8 h-8 rounded-full bg-[#073642] border border-[#268bd2] shadow" />
              <div className="absolute -top-4 left-36 w-8 h-8 rounded-full bg-[#073642] border border-[#268bd2] shadow" />
              <div className="absolute -top-4 left-56 w-8 h-8 rounded-full bg-[#073642] border border-[#268bd2] shadow" />
              <div className="absolute -bottom-4 left-16 w-8 h-8 rounded-full bg-[#073642] border border-[#268bd2] shadow" />
              <div className="absolute -bottom-4 left-36 w-8 h-8 rounded-full bg-[#073642] border border-[#268bd2] shadow" />
              <div className="absolute -bottom-4 left-56 w-8 h-8 rounded-full bg-[#073642] border border-[#268bd2] shadow" />
            </div>

            <div className="text-[9px] text-[#268bd2] font-mono text-center bg-[#eee8d5] py-0.5 rounded border border-[#268bd2]/40 font-bold w-full">
              Whiteboard & Projector Station 📽️
            </div>
          </button>

          {/* ROOM 3: BREAKROOM & PANTRY WITH CUSTOM 2D MACHINES */}
          <div className="absolute left-[960px] top-[40px] w-[400px] h-[300px] rounded-lg border-4 border-[#cb4b16] bg-[#fdf6e3]/90 p-3 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-2 border-[#cb4b16] pb-1">
              <span className="font-pixel text-[10px] text-[#cb4b16] font-bold flex items-center gap-1">
                ☕ THE BREAKROOM & PANTRY
              </span>
              <span className="text-[9px] text-[#859900] font-mono animate-pulse font-bold">● Coffee Brewing</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              {/* Custom Espresso Coffee Machine */}
              <button
                type="button"
                onClick={() => {
                  playRetroSound("coffee");
                  onTriggerCoffee();
                  agents.forEach((a) => {
                    triggerAgentCoffeeRun(a.id);
                  });
                }}
                className="bg-[#eee8d5] border-2 border-[#cb4b16] p-2.5 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-md group"
              >
                <EspressoMachineGraphic />
                <div className="font-pixel text-[10px] text-[#cb4b16] font-bold mt-1">Espresso Machine</div>
                <div className="text-[8px] text-[#859900] font-mono font-bold">Dark Roast Ready</div>
              </button>

              {/* Custom Water Dispenser Machine */}
              <button
                type="button"
                onClick={() => playRetroSound("blip")}
                className="bg-[#eee8d5] border-2 border-[#2aa198] p-2.5 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-md group"
              >
                <WaterCoolerGraphic />
                <div className="font-pixel text-[10px] text-[#2aa198] font-bold mt-1">Water Cooler</div>
                <div className="text-[8px] text-[#268bd2] font-mono font-bold">Startup Gossip Hub</div>
              </button>
            </div>

            <div className="text-[9px] text-[#cb4b16] font-mono text-center bg-[#eee8d5] py-0.5 rounded border border-[#cb4b16]/40 font-bold">
              Pantry Entrance Door 🚪 (South)
            </div>
          </div>

          {/* MAIN CENTRAL CORRIDOR / HALLWAY */}
          <div className="absolute left-[40px] top-[340px] w-[1320px] h-[120px] bg-[#eee8d5] border-y-4 border-[#b58900] flex items-center justify-between px-6 shadow-inner">
            <div className="text-[10px] font-pixel text-[#586e75] tracking-widest uppercase font-bold">
              ◄ WEST WING CORRIDOR
            </div>
            <div className="flex-1 mx-8 border-b-2 border-dashed border-[#b58900] relative flex items-center justify-center">
              <span className="bg-[#eee8d5] px-3 font-pixel text-[9px] text-[#cb4b16] font-bold">
                🚶 AGENT PANTRY & COFFEE HIGHWAY
              </span>
            </div>
            <div className="text-[10px] font-pixel text-[#586e75] tracking-widest uppercase font-bold">
              EAST PANTRY WING ►
            </div>
          </div>

          {/* ROOM 4: SOCIAL MEDIA & BROWSER AUTOMATION */}
          <div className="absolute left-[40px] top-[500px] w-[400px] h-[360px] rounded-lg border-4 border-[#d33682] bg-[#fdf6e3]/90 p-3 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-2 border-[#d33682] pb-1">
              <span className="font-pixel text-[10px] text-[#d33682] font-bold">
                📱 SOCIAL & BROWSER POD — PAM & JIM
              </span>
              <span className="text-[9px] text-[#586e75] font-mono">2 Workstations</span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-auto">
              <div className="bg-[#eee8d5] border border-[#d33682] p-2.5 rounded-lg text-center relative shadow">
                <div className="font-pixel text-[9px] text-[#d33682] font-bold">Pam's Desk</div>
                <div className="text-[8px] text-[#586e75] font-mono mt-1">Calendar & Artwork</div>
                <div className="w-16 h-8 bg-[#073642] border border-[#d33682] rounded mx-auto mt-2 p-0.5">
                  <div className="w-full h-1 bg-[#d33682] rounded-[1px] animate-pulse" />
                </div>
              </div>

              <div className="bg-[#eee8d5] border border-[#2aa198] p-2.5 rounded-lg text-center relative shadow">
                <div className="font-pixel text-[9px] text-[#2aa198] font-bold">Jim's Desk</div>
                <div className="text-[8px] text-[#586e75] font-mono mt-1">Browser CDP Hook</div>
                <div className="w-16 h-8 bg-[#073642] border border-[#2aa198] rounded mx-auto mt-2 p-0.5">
                  <div className="w-full h-1 bg-[#2aa198] rounded-[1px] animate-pulse" />
                </div>
              </div>
            </div>

            <div className="text-[9px] text-[#d33682] font-mono text-center bg-[#eee8d5] py-0.5 rounded border border-[#d33682]/40 font-bold">
              Cabin Door 🚪 (North)
            </div>
          </div>

          {/* ROOM 5: CAPITAL & DAY PLANNING */}
          <div className="absolute left-[480px] top-[500px] w-[420px] h-[360px] rounded-lg border-4 border-[#859900] bg-[#fdf6e3]/90 p-3 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-2 border-[#859900] pb-1">
              <span className="font-pixel text-[10px] text-[#859900] font-bold">
                💰 CAPITAL & PLANNING — DWIGHT & STANLEY
              </span>
              <span className="text-[9px] text-[#586e75] font-mono">Grants & Focus</span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-auto">
              <div className="bg-[#eee8d5] border border-[#859900] p-2.5 rounded-lg text-center relative shadow">
                <div className="font-pixel text-[9px] text-[#859900] font-bold">Dwight's Desk</div>
                <div className="text-[8px] text-[#586e75] font-mono mt-1">Beet Jar & VC Grants</div>
                <div className="w-16 h-8 bg-[#073642] border border-[#859900] rounded mx-auto mt-2 p-0.5">
                  <div className="w-full h-1 bg-[#859900] rounded-[1px] animate-pulse" />
                </div>
              </div>

              <div className="bg-[#eee8d5] border border-[#268bd2] p-2.5 rounded-lg text-center relative shadow">
                <div className="font-pixel text-[9px] text-[#268bd2] font-bold">Stanley's Desk</div>
                <div className="text-[8px] text-[#586e75] font-mono mt-1">Crosswords & Pretzels</div>
                <div className="w-16 h-8 bg-[#073642] border border-[#268bd2] rounded mx-auto mt-2 p-0.5">
                  <div className="w-full h-1 bg-[#268bd2] rounded-[1px] animate-pulse" />
                </div>
              </div>
            </div>

            <div className="text-[9px] text-[#859900] font-mono text-center bg-[#eee8d5] py-0.5 rounded border border-[#859900]/40 font-bold">
              Cabin Door 🚪 (North)
            </div>
          </div>

          {/* ROOM 6: HR, SAFETY & SaaS AUDIT */}
          <div className="absolute left-[940px] top-[500px] w-[420px] h-[360px] rounded-lg border-4 border-[#6c71c4] bg-[#fdf6e3]/90 p-3 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-2 border-[#6c71c4] pb-1">
              <span className="font-pixel text-[10px] text-[#6c71c4] font-bold">
                🤝 HR, SAFETY & AUDIT — RYAN, TOBY & ANGELA
              </span>
              <span className="text-[9px] text-[#586e75] font-mono">3 Workstations</span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-auto">
              <div className="bg-[#eee8d5] border border-[#6c71c4] p-2 rounded text-center shadow">
                <div className="font-pixel text-[8px] text-[#6c71c4] font-bold">Ryan</div>
                <div className="text-[7px] text-[#586e75] font-mono">Meetups</div>
              </div>
              <div className="bg-[#eee8d5] border border-[#586e75] p-2 rounded text-center shadow">
                <div className="font-pixel text-[8px] text-[#586e75] font-bold">Toby</div>
                <div className="text-[7px] text-[#586e75] font-mono">HR Safety</div>
              </div>
              <div className="bg-[#eee8d5] border border-[#dc322f] p-2 rounded text-center shadow">
                <div className="font-pixel text-[8px] text-[#dc322f] font-bold">Angela</div>
                <div className="text-[7px] text-[#586e75] font-mono">Audit</div>
              </div>
            </div>

            <div className="text-[9px] text-[#6c71c4] font-mono text-center bg-[#eee8d5] py-0.5 rounded border border-[#6c71c4]/40 font-bold">
              Cabin Door 🚪 (North)
            </div>
          </div>

          {/* DYNAMIC TOP-VIEW AGENT SPRITES */}
          {agents.map((agent) => {
            const motion = agentMotions[agent.id] || {
              x: 700,
              y: 450,
              facingDir: "front",
              hasCoffee: false,
              motionState: "at_desk",
              thought: ""
            };

            const isSelected = selectedAgentId === agent.id;
            const isMoving = motion.motionState !== "at_desk";

            return (
              <button
                type="button"
                key={agent.id}
                onClick={() => {
                  playRetroSound("click");
                  onSelectAgent(agent);
                  setCamera((prev) => ({ ...prev, isLocked: true }));
                }}
                className="absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 border-none bg-transparent p-0 cursor-pointer text-left"
                style={{
                  left: `${motion.x}px`,
                  top: `${motion.y}px`
                }}
              >
                <TopViewAgentSprite
                  agentId={agent.id}
                  name={agent.name}
                  status={agent.status}
                  hasCoffee={motion.hasCoffee}
                  isMoving={isMoving}
                  facingDir={motion.facingDir || "front"}
                  currentThought={motion.thought || agent.currentThought}
                  isSelected={isSelected}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
