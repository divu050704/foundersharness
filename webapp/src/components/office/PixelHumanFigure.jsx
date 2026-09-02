"use client";

// Custom Pixel-Art Human Sprite Character Renderer for Founder Harness Agents

export default function PixelHumanFigure({ agentId, size = "md", isWorking = false }) {
  const sizeClasses = {
    sm: "w-8 h-10",
    md: "w-12 h-14",
    lg: "w-16 h-20"
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  // Custom SVG Character Sprites for each Founder Harness agent
  const renderCharacter = () => {
    switch (agentId) {
      case "alex":
        // Alex Rivera: Dark hair, navy suit, white shirt, red tie
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Hair */}
            <path d="M10 6 Q16 2 22 6 L23 10 L9 10 Z" fill="#1c1917" />
            {/* Face */}
            <rect x="10" y="9" width="12" height="9" fill="#fbcfe8" rx="1" />
            {/* Eyes */}
            <rect x="12" y="12" width="2" height="2" fill="#1c1917" />
            <rect x="18" y="12" width="2" height="2" fill="#1c1917" />
            {/* Smirk */}
            <path d="M14 16 Q16 18 18 16" stroke="#be185d" strokeWidth="1" fill="none" />
            {/* Suit Collar & Red Tie */}
            <path d="M10 18 L22 18 L24 36 L8 36 Z" fill="#1e3a8a" />
            <polygon points="15,18 17,18 16.5,28 15.5,28" fill="#dc2626" />
            <polygon points="12,18 15,22 15,18" fill="#ffffff" />
            <polygon points="20,18 17,22 17,18" fill="#ffffff" />
            {/* Arms / Hands typing */}
            <rect x="6" y="22" width="4" height="10" fill="#1e3a8a" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="22" y="22" width="4" height="10" fill="#1e3a8a" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      case "victor":
        // Victor Stone: Middle-part brown hair, mustard yellow shirt, brown tie, glasses
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Center-part Hair */}
            <path d="M9 7 C12 3 15 8 16 8 C17 8 20 3 23 7 L24 11 L8 11 Z" fill="#78350f" />
            {/* Face */}
            <rect x="9" y="10" width="14" height="9" fill="#fde047" rx="1" />
            {/* Wire Glasses */}
            <rect x="11" y="12" width="4" height="3" fill="none" stroke="#854d0e" strokeWidth="1" />
            <rect x="17" y="12" width="4" height="3" fill="none" stroke="#854d0e" strokeWidth="1" />
            <line x1="15" y1="13" x2="17" y2="13" stroke="#854d0e" strokeWidth="1" />
            {/* Stern Mouth */}
            <line x1="14" y1="17" x2="18" y2="17" stroke="#713f12" strokeWidth="1" />
            {/* Mustard Yellow Shirt & Brown Tie */}
            <path d="M9 19 L23 19 L25 36 L7 36 Z" fill="#eab308" />
            <polygon points="15,19 17,19 16.5,29 15.5,29" fill="#451a03" />
            {/* Arms */}
            <rect x="5" y="22" width="4" height="10" fill="#eab308" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="23" y="22" width="4" height="10" fill="#eab308" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      case "lucas":
        // Lucas Bennett: Shaggy hair, light blue shirt, black tie
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Shaggy Brown Hair */}
            <path d="M8 6 Q16 2 24 6 L25 11 L7 11 Z" fill="#581c87" />
            <path d="M7 8 Q5 12 8 13" stroke="#581c87" strokeWidth="2" fill="none" />
            {/* Face */}
            <rect x="9" y="10" width="14" height="9" fill="#fed7aa" rx="1" />
            {/* Eyes looking sideways */}
            <circle cx="12" cy="13" r="1" fill="#1c1917" />
            <circle cx="18" cy="13" r="1" fill="#1c1917" />
            {/* Lucas Smirk */}
            <path d="M13 16 Q17 18 19 15" stroke="#9a3412" strokeWidth="1" fill="none" />
            {/* Light Blue Shirt & Dark Tie */}
            <path d="M9 19 L23 19 L25 36 L7 36 Z" fill="#38bdf8" />
            <polygon points="15,19 17,19 16.5,30 15.5,30" fill="#0f172a" />
            {/* Arms */}
            <rect x="5" y="22" width="4" height="10" fill="#38bdf8" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="23" y="22" width="4" height="10" fill="#38bdf8" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      case "sophia":
        // Sophia Chen: Wavy reddish hair, pink cardigan
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Wavy Red-Brown Hair */}
            <path d="M6 7 Q16 1 26 7 L27 18 Q23 20 22 13 L10 13 Q9 20 5 18 Z" fill="#b45309" />
            {/* Face */}
            <rect x="10" y="9" width="12" height="9" fill="#fde68a" rx="1" />
            {/* Eyes */}
            <circle cx="13" cy="12" r="1" fill="#1c1917" />
            <circle cx="19" cy="12" r="1" fill="#1c1917" />
            {/* Smile */}
            <path d="M14 15 Q16 17 18 15" stroke="#92400e" strokeWidth="1" fill="none" />
            {/* Pink Cardigan */}
            <path d="M9 18 L23 18 L25 36 L7 36 Z" fill="#f472b6" />
            <polygon points="14,18 18,18 16,28" fill="#ffffff" />
            {/* Arms */}
            <rect x="5" y="21" width="4" height="10" fill="#f472b6" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="23" y="21" width="4" height="10" fill="#f472b6" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      case "roman":
        // Roman Cole: Dark hair, black vest over white shirt
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Slick Hair */}
            <path d="M9 5 Q16 1 23 5 L24 9 L8 9 Z" fill="#0f172a" />
            {/* Face */}
            <rect x="9" y="9" width="14" height="9" fill="#fde047" rx="1" />
            {/* Eyes */}
            <circle cx="12" cy="12" r="1" fill="#0f172a" />
            <circle cx="18" cy="12" r="1" fill="#0f172a" />
            {/* Black Vest */}
            <path d="M9 18 L23 18 L25 36 L7 36 Z" fill="#f8fafc" />
            <polygon points="9,18 13,18 14,36 7,36" fill="#1e293b" />
            <polygon points="23,18 19,18 18,36 25,36" fill="#1e293b" />
            {/* Arms */}
            <rect x="5" y="21" width="4" height="10" fill="#1e293b" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="23" y="21" width="4" height="10" fill="#1e293b" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      case "samuel":
        // Samuelley Hudson: Moustache, gray suit
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Bald / Short Hair */}
            <path d="M10 6 Q16 4 22 6 L23 9 L9 9 Z" fill="#1c1917" />
            {/* Face */}
            <rect x="9" y="9" width="14" height="10" fill="#9a3412" rx="1" />
            {/* Eyes */}
            <rect x="12" y="11" width="2" height="1" fill="#1c1917" />
            <rect x="18" y="11" width="2" height="1" fill="#1c1917" />
            {/* Moustache */}
            <rect x="12" y="15" width="8" height="2" fill="#1c1917" rx="1" />
            {/* Gray Suit */}
            <path d="M8 19 L24 19 L26 36 L6 36 Z" fill="#475569" />
            <polygon points="14,19 18,19 16,30" fill="#94a3b8" />
            {/* Arms */}
            <rect x="4" y="22" width="4" height="10" fill="#475569" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="24" y="22" width="4" height="10" fill="#475569" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      case "tyler":
        // Tyler Reed: Beige jacket, neutral expression
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Receding Light Brown Hair */}
            <path d="M11 6 Q16 5 21 6 L22 9 L10 9 Z" fill="#92400e" />
            {/* Face */}
            <rect x="9" y="9" width="14" height="9" fill="#fde68a" rx="1" />
            {/* Sad Eyes */}
            <line x1="11" y1="12" x2="13" y2="13" stroke="#1c1917" strokeWidth="1" />
            <line x1="21" y1="12" x2="19" y2="13" stroke="#1c1917" strokeWidth="1" />
            {/* Neutral Mouth */}
            <line x1="14" y1="16" x2="18" y2="16" stroke="#78350f" strokeWidth="1" />
            {/* Beige Jacket */}
            <path d="M9 18 L23 18 L25 36 L7 36 Z" fill="#d97706" />
            <polygon points="14,18 18,18 16,28" fill="#1e3a8a" />
            {/* Arms */}
            <rect x="5" y="21" width="4" height="10" fill="#d97706" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="23" y="21" width="4" height="10" fill="#d97706" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      case "aria":
        // Aria Morgan: Blonde hair updo, high collar shirt, gray sweater
        return (
          <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
            {/* Blonde Hair Bun */}
            <circle cx="16" cy="5" r="4" fill="#facc15" />
            <path d="M9 8 Q16 5 23 8 L24 11 L8 11 Z" fill="#facc15" />
            {/* Face */}
            <rect x="10" y="10" width="12" height="8" fill="#fef08a" rx="1" />
            {/* Strict Eyes */}
            <circle cx="13" cy="12" r="1" fill="#1c1917" />
            <circle cx="19" cy="12" r="1" fill="#1c1917" />
            {/* Strict Straight Mouth */}
            <line x1="14" y1="15" x2="18" y2="15" stroke="#713f12" strokeWidth="1" />
            {/* Gray High Collar Sweater */}
            <path d="M9 18 L23 18 L25 36 L7 36 Z" fill="#64748b" />
            <rect x="14" y="18" width="4" height="4" fill="#ffffff" />
            {/* Arms */}
            <rect x="5" y="21" width="4" height="10" fill="#64748b" rx="1" className={isWorking ? "animate-bounce" : ""} />
            <rect x="23" y="21" width="4" height="10" fill="#64748b" rx="1" className={isWorking ? "animate-bounce" : ""} />
          </svg>
        );

      default:
        return (
          <div className="w-full h-full bg-[#f59e0b] rounded flex items-center justify-center font-pixel text-xs text-slate-950 font-bold">
            ?
          </div>
        );
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${currentSize}`}>
      {renderCharacter()}
    </div>
  );
}
