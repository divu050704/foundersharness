"use client";

// Full-Body & Face Visible Upright Sprite for 2D Solarized Office Floor Map
export default function TopViewAgentSprite({
  agentId,
  name,
  status = "idle",
  hasCoffee = false,
  isMoving = false,
  facingDir = "right", // "left" | "right" | "front"
  currentThought = "",
  isSelected = false
}) {
  const getAgentConfig = () => {
    switch (agentId) {
      case "michael":
        return {
          hair: "#1c1917",
          skin: "#fbcfe8",
          clothes: "#1e3a8a",
          pants: "#1e293b",
          detail: "#dc322f",
          shoes: "#073642"
        };
      case "dwight":
        return {
          hair: "#78350f",
          skin: "#fde047",
          clothes: "#b58900",
          pants: "#451a03",
          detail: "#451a03",
          shoes: "#073642"
        };
      case "jim":
        return {
          hair: "#581c87",
          skin: "#fed7aa",
          clothes: "#268bd2",
          pants: "#0f172a",
          detail: "#0f172a",
          shoes: "#073642"
        };
      case "pam":
        return {
          hair: "#cb4b16",
          skin: "#fde68a",
          clothes: "#d33682",
          pants: "#475569",
          detail: "#ffffff",
          shoes: "#073642"
        };
      case "ryan":
        return {
          hair: "#073642",
          skin: "#fde047",
          clothes: "#073642",
          pants: "#1e293b",
          detail: "#f8fafc",
          shoes: "#073642"
        };
      case "stanley":
        return {
          hair: "#1c1917",
          skin: "#9a3412",
          clothes: "#586e75",
          pants: "#334155",
          detail: "#94a3b8",
          shoes: "#073642"
        };
      case "toby":
        return {
          hair: "#92400e",
          skin: "#fde68a",
          clothes: "#c49a45",
          pants: "#1e3a8a",
          detail: "#1e3a8a",
          shoes: "#073642"
        };
      case "angela":
        return {
          hair: "#b58900",
          skin: "#fef08a",
          clothes: "#657b83",
          pants: "#334155",
          detail: "#ffffff",
          shoes: "#073642"
        };
      default:
        return {
          hair: "#334155",
          skin: "#cbd5e1",
          clothes: "#268bd2",
          pants: "#1e293b",
          detail: "#b58900",
          shoes: "#073642"
        };
    }
  };

  const cfg = getAgentConfig();

  // Render character specific facial features (eyes, expression, glasses, hair style)
  const renderFace = () => {
    switch (agentId) {
      case "michael":
        return (
          <g>
            <path d="M-10,-24 Q0,-32 10,-24 L10,-18 L-10,-18 Z" fill={cfg.hair} />
            <circle cx="-4" cy="-14" r="1.5" fill="#073642" />
            <circle cx="4" cy="-14" r="1.5" fill="#073642" />
            <path d="M-3,-9 Q0,-6 4,-9" stroke="#dc322f" strokeWidth="1" fill="none" />
          </g>
        );
      case "dwight":
        return (
          <g>
            <path d="M-10,-22 C-5,-30 0,-24 0,-24 C0,-24 5,-30 10,-22 L10,-18 L-10,-18 Z" fill={cfg.hair} />
            <rect x="-7" y="-17" width="5" height="4" fill="none" stroke="#451a03" strokeWidth="1" />
            <rect x="2" y="-17" width="5" height="4" fill="none" stroke="#451a03" strokeWidth="1" />
            <line x1="-2" y1="-15" x2="2" y2="-15" stroke="#451a03" strokeWidth="1" />
            <line x1="-3" y1="-9" x2="3" y2="-9" stroke="#451a03" strokeWidth="1" />
          </g>
        );
      case "jim":
        return (
          <g>
            <path d="M-11,-23 Q0,-31 11,-23 L11,-17 L-11,-17 Z" fill={cfg.hair} />
            <circle cx="-3" cy="-14" r="1.5" fill="#073642" />
            <circle cx="5" cy="-14" r="1.5" fill="#073642" />
            <path d="M-3,-9 Q1,-6 4,-10" stroke="#073642" strokeWidth="1" fill="none" />
          </g>
        );
      case "pam":
        return (
          <g>
            <path d="M-12,-24 Q0,-32 12,-24 L13,-12 L-13,-12 Z" fill={cfg.hair} />
            <rect x="-8" y="-20" width="16" height="14" rx="2" fill={cfg.skin} />
            <circle cx="-4" cy="-15" r="1.5" fill="#073642" />
            <circle cx="4" cy="-15" r="1.5" fill="#073642" />
            <path d="M-3,-9 Q0,-6 3,-9" stroke="#b58900" strokeWidth="1" fill="none" />
          </g>
        );
      case "ryan":
        return (
          <g>
            <path d="M-10,-24 Q0,-31 10,-24 L10,-18 L-10,-18 Z" fill={cfg.hair} />
            <circle cx="-4" cy="-14" r="1.5" fill="#073642" />
            <circle cx="4" cy="-14" r="1.5" fill="#073642" />
            <line x1="-3" y1="-9" x2="3" y2="-9" stroke="#073642" strokeWidth="1" />
          </g>
        );
      case "stanley":
        return (
          <g>
            <path d="M-10,-20 Q0,-24 10,-20 L10,-16 L-10,-16 Z" fill={cfg.hair} />
            <line x1="-5" y1="-14" x2="-2" y2="-14" stroke="#073642" strokeWidth="1.5" />
            <line x1="2" y1="-14" x2="5" y2="-14" stroke="#073642" strokeWidth="1.5" />
            <rect x="-4" y="-10" width="8" height="2.5" fill="#1c1917" rx="1" />
          </g>
        );
      case "toby":
        return (
          <g>
            <path d="M-9,-22 Q0,-26 9,-22 L9,-18 L-9,-18 Z" fill={cfg.hair} />
            <line x1="-5" y1="-15" x2="-2" y2="-13" stroke="#073642" strokeWidth="1" />
            <line x1="5" y1="-15" x2="2" y2="-13" stroke="#073642" strokeWidth="1" />
            <line x1="-3" y1="-8" x2="3" y2="-8" stroke="#073642" strokeWidth="1" />
          </g>
        );
      case "angela":
        return (
          <g>
            <circle cx="0" cy="-26" r="3.5" fill={cfg.hair} />
            <path d="M-9,-22 Q0,-26 9,-22 L9,-18 L-9,-18 Z" fill={cfg.hair} />
            <circle cx="-4" cy="-14" r="1.2" fill="#073642" />
            <circle cx="4" cy="-14" r="1.2" fill="#073642" />
            <line x1="-3" y1="-9" x2="3" y2="-9" stroke="#073642" strokeWidth="1" />
          </g>
        );
      default:
        return (
          <g>
            <circle cx="-4" cy="-14" r="1.5" fill="#073642" />
            <circle cx="4" cy="-14" r="1.5" fill="#073642" />
          </g>
        );
    }
  };

  const isLeftFacing = facingDir === "left";

  return (
    <div className="relative group cursor-pointer select-none">
      {/* Floating Solarized Thought Bubble (Always upright) */}
      {currentThought && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap animate-float-speech">
          <div className="bg-[#fdf6e3] text-[#073642] text-[10px] font-mono px-2.5 py-1 rounded-md border-2 border-[#b58900] shadow-xl flex items-center gap-1.5 backdrop-blur-md">
            <span className="size-2 rounded-full bg-[#cb4b16] animate-ping shrink-0" />
            <span className="truncate max-w-[200px] text-[#b58900] font-bold">{currentThought}</span>
          </div>
          <div className="w-2 h-2 bg-[#fdf6e3] border-r-2 border-b-2 border-[#b58900] rotate-45 mx-auto -mt-1" />
        </div>
      )}

      {/* Selected Halo / Camera Highlight Ring */}
      {isSelected && (
        <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#cb4b16] animate-spin-slow pointer-events-none shadow-[0_0_20px_rgba(203,75,22,0.6)]" />
      )}

      {/* ALWAYS UPRIGHT CHARACTER BODY (Flipped scaleX horizontally when moving left) */}
      <div
        className={`transition-transform duration-75 ${isMoving ? "animate-bounce-subtle" : ""}`}
        style={{ transform: isLeftFacing ? "scaleX(-1)" : "scaleX(1)" }}
      >
        <svg
          viewBox="-24 -40 48 80"
          className="w-14 h-20 overflow-visible filter drop-shadow-md"
          aria-hidden="true"
        >
          {/* Shadow on Floor */}
          <ellipse cx="0" cy="34" rx="16" ry="6" fill="rgba(7,54,66,0.25)" />

          {/* Shoes / Feet */}
          <ellipse cx="-7" cy="32" rx="4.5" ry="3" fill={cfg.shoes} />
          <ellipse cx="7" cy="32" rx="4.5" ry="3" fill={cfg.shoes} />

          {/* Trousers / Legs */}
          <rect x="-9" y="14" width="6.5" height="18" rx="2" fill={cfg.pants} stroke="#073642" strokeWidth="1" />
          <rect x="2.5" y="14" width="6.5" height="18" rx="2" fill={cfg.pants} stroke="#073642" strokeWidth="1" />

          {/* Torso / Clothes */}
          <rect x="-14" y="-8" width="28" height="23" rx="4" fill={cfg.clothes} stroke="#073642" strokeWidth="1.5" />

          {/* Collar / Tie detail */}
          <polygon points="-3,-8 3,-8 0,2" fill={cfg.detail} />

          {/* Arms & Hands */}
          <rect x="-18" y="-4" width="5" height="16" rx="2.5" fill={cfg.clothes} stroke="#073642" strokeWidth="1" />
          <rect x="13" y="-4" width="5" height="16" rx="2.5" fill={cfg.clothes} stroke="#073642" strokeWidth="1" />
          <circle cx="-15.5" cy="13" r="3" fill={cfg.skin} />
          <circle cx="15.5" cy="13" r="3" fill={cfg.skin} />

          {/* Coffee Cup in Hand */}
          {hasCoffee && (
            <g transform="translate(18, 10)">
              <circle cx="0" cy="0" r="5.5" fill="#cb4b16" stroke="#073642" strokeWidth="1" />
              <circle cx="0" cy="0" r="3.5" fill="#586e75" />
              <path d="M-1,-6 Q0,-9 1,-11" stroke="#fdf6e3" strokeWidth="1.5" fill="none" opacity="0.9" className="animate-pulse" />
            </g>
          )}

          {/* Head & Face Container */}
          <rect x="-10" y="-27" width="20" height="19" rx="4" fill={cfg.skin} stroke="#073642" strokeWidth="1.5" />

          {/* Custom Facial Features & Hair */}
          {renderFace()}
        </svg>
      </div>

      {/* Solarized Light Name Badge under character (Always upright) */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#fdf6e3] text-[#073642] text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-[#b58900] shadow flex items-center gap-1">
        <span>{name.split(" ")[0]}</span>
        {agentId === "michael" && <span className="text-[8px]">👑</span>}
      </div>
    </div>
  );
}
