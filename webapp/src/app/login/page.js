"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "next-themes";

const shapes = [
  {
    name: "Autonomous Publishing",
    desc: "Posts content autonomously using browser-level sessions, removing the need for API access.",
    color: "#C2704F",
    path: "M150,30 C215,35 265,80 270,145 C275,210 220,265 150,268 C85,270 35,220 32,150 C30,85 85,25 150,30 Z"
  },
  {
    name: "Smart Scheduling",
    desc: "Automatically manages calendar slots, blocks focus time, and coordinates founder meetings.",
    color: "#4F7A8C",
    path: "M150,45 C200,40 250,75 255,140 C260,205 215,255 150,255 C90,255 45,210 45,145 C45,80 100,50 150,45 Z"
  },
  {
    name: "Capital Discovery",
    desc: "Surfaces and matches non-dilutive grants and startup credits before you start looking.",
    color: "#B9954A",
    path: "M150,35 C205,30 260,70 262,145 C264,215 210,262 148,260 C88,258 40,215 38,148 C36,82 92,40 150,35 Z"
  },
  {
    name: "Strategy Planner",
    desc: "Pressure-tests your next 90 days and maintains alignment with your business model.",
    color: "#4A6B4E",
    path: "M150,40 C195,20 255,55 268,130 C280,200 235,262 155,265 C80,268 30,205 35,135 C40,70 100,60 150,40 Z"
  },
  {
    name: "Founder Networking",
    desc: "Crawls local groups and events to find demo days and networking opportunities.",
    color: "#8A6B95",
    path: "M140,45 C185,25 240,45 260,110 C280,180 245,250 165,262 C95,272 40,225 40,155 C40,95 90,65 140,45 Z"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();

  // Login States
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  // Capability Morph States
  const [flubberLoaded, setFlubberLoaded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [activeIconIndex, setActiveIconIndex] = useState(0);
  const [capName, setCapName] = useState(shapes[0].name);
  const [capDesc, setCapDesc] = useState(shapes[0].desc);
  const [showCaption, setShowCaption] = useState(true);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Refs for Morph Logic
  const blobRef = useRef(null);
  const currentPathRef = useRef(shapes[0].path);
  const pausedRef = useRef(false);
  const timerRef = useRef(null);

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `/api/user`,
      });
    } catch (error) {
      console.error("Google authentication error:", error);
      toast.error("Google Sign-In failed.");
      setIsAuthenticating(false);
    }
  };


  // Morph loop orchestration
  useEffect(() => {
    resetTimer(0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flubberLoaded]);

  const resetTimer = (targetIdx) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!pausedRef.current) {
      timerRef.current = setTimeout(() => {
        const nextIdx = (targetIdx + 1) % shapes.length;
        morphTo(nextIdx);
        resetTimer(nextIdx);
      }, 2600);
    }
  };

  const morphTo = (targetIdx) => {
    const target = shapes[targetIdx];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Transition caption text
    setShowCaption(false);
    setTimeout(() => {
      setCapName(target.name);
      setCapDesc(target.desc);
      setShowCaption(true);
    }, 200);

    setCurrent(targetIdx);

    // Apply morphing
    if (!window.flubber || reduceMotion) {
      if (blobRef.current) {
        blobRef.current.setAttribute("d", target.path);
        blobRef.current.style.fill = target.color;
      }
      currentPathRef.current = target.path;
      setActiveIconIndex(targetIdx);
      return;
    }

    try {
      const interpolator = window.flubber.interpolate(
        currentPathRef.current,
        target.path,
        { maxSegmentLength: 2 }
      );

      if (blobRef.current) {
        blobRef.current.style.fill = target.color;
      }

      setActiveIconIndex(-1); // Hide active icon during morph

      const duration = 900;
      const start = performance.now();

      const frame = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        if (blobRef.current) {
          blobRef.current.setAttribute("d", interpolator(eased));
        }

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          currentPathRef.current = target.path;
          setActiveIconIndex(targetIdx);
        }
      };

      requestAnimationFrame(frame);
    } catch (err) {
      console.error("Morph interpolation error:", err);
      if (blobRef.current) {
        blobRef.current.setAttribute("d", target.path);
        blobRef.current.style.fill = target.color;
      }
      currentPathRef.current = target.path;
      setActiveIconIndex(targetIdx);
    }
  };

  const goTo = (idx) => {
    morphTo(idx);
    resetTimer(idx);
  };



  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full bg-background text-foreground transition-colors duration-500 font-sans overflow-hidden">

      {/* LEFT PANEL: BESPOKE TACTILE FIELD NOTES NOTEBOOK PAGE */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-background border-r border-border relative overflow-hidden transition-colors duration-500 select-none">

        {/* Notebook Vertical Margin Line */}
        <div className="absolute top-0 bottom-0 left-10 md:left-14 w-px bg-red-950/15 dark:bg-red-500/10 pointer-events-none" />

        {/* Notebook horizontal ruled line patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(44,44,39,0.03)_1px,transparent_1px)] bg-[size:100%_24px] pointer-events-none" />

        {/* 1. Header Metadata Stamp */}
        <div className="z-10 pl-6 md:pl-10 space-y-4">
          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest">
            <span>FN-HARNESS // VOL. 01</span>
            <span>SECURE ENTRY</span>
          </div>
          <div className="border-t border-border pt-4">
            <h1 className="font-sans font-extrabold text-3xl tracking-tight text-foreground leading-none">
              FOUNDERS HARNESS
            </h1>
            <p className="font-mono text-[9px] text-primary uppercase tracking-widest mt-2 font-bold">
              [Unified Memory & MCP Automation]
            </p>
          </div>
        </div>

        {/* 2. Bespoke Sign In Panel */}
        <div className="z-10 pl-6 md:pl-10 py-12 max-w-sm w-full space-y-8">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
              [Sign In Credentials]
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed pr-4">
              Authenticate via OAuth to retrieve workspace memory and synchronize active automation connectors.
            </p>
          </div>

          <div className="space-y-6">

            {/* Google OAuth Trigger */}
            <div className="w-full min-h-[50px] flex justify-center">
              {isAuthenticating ? (
                <div className="flex items-center gap-2.5 font-mono text-[10px] text-[#8c897e] dark:text-[#EDEAE2]">
                  <Loader2 className="size-4 text-primary animate-spin" />
                  <span>AUTHENTICATING WITH GOOGLE...</span>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full"
                >
                  Continue with Google
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* 3. Footer Coordinates Stamp */}
        <div className="z-10 pl-6 md:pl-10 border-t border-border pt-4 flex items-center justify-between text-[9px] font-mono text-muted-foreground/60">
          <div>LOC: [D5000_A3000]</div>
          <div>MEM_DNA: [ACTIVE]</div>
        </div>

      </div>

      {/* RIGHT PANEL: CAPABILITY MORPH SVG/CSS SHOWCASE (Always Dark matte slate matching specifications) */}
      <div
        className="hidden lg:flex lg:col-span-7 flex-col items-center justify-between p-12 bg-[#121210] text-[#EDEAE2] relative overflow-hidden transition-all duration-1000"
      >
        {/* Dynamic cross-fading background radial glow overlays */}
        {shapes.map((s, idx) => (
          <div
            key={idx}
            className="absolute inset-0 transition-opacity duration-1000 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at center, ${s.color}18 0%, rgba(18, 18, 16, 0) 75%)`,
              opacity: current === idx ? 1 : 0,
            }}
          />
        ))}

        {/* Paper texture grain lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(44,44,39,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(44,44,39,0.04)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Header Branding */}
        <div className="flex flex-col items-center gap-1.5 text-center z-10 select-none">
          <span className="font-mono text-[9px] tracking-widest text-[#8C897E] uppercase font-bold">
            Founders Harness Platform
          </span>
          <h2 className="text-xl font-bold tracking-tight text-[#EDEAE2]">
            Core Platform Capabilities
          </h2>
        </div>

        {/* Morphing Blob Stage Area */}
        <div className="flex flex-col items-center gap-8 max-w-[420px] w-full z-10">

          {/* Morphing Blob Wrapper */}
          <div
            className="relative w-[260px] height-[260px] aspect-square cursor-pointer transition-transform duration-500 hover:scale-102"
            onMouseEnter={() => { pausedRef.current = true; if (timerRef.current) clearTimeout(timerRef.current); }}
            onMouseLeave={() => { pausedRef.current = false; resetTimer(current); }}
          >
            {/* Morphing SVG with dynamic drop shadow matching current shape's color */}
            <svg
              viewBox="0 0 300 300"
              className="w-full h-full overflow-visible transition-all duration-1000"
              style={{
                filter: `drop-shadow(0 15px 35px ${shapes[current].color}33)`,
              }}
              role="img"
              aria-hidden="true"
            >
              <path
                ref={blobRef}
                d={shapes[0].path}
                fill={shapes[0].color}
                style={{ transition: "fill .5s ease" }}
              />
            </svg>

            {/* Icon 0: Ocaya (Autonomous Publishing) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none transition-all duration-[450ms] ${activeIconIndex === 0 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-6"}`}>
              <svg viewBox="0 0 64 64" fill="none" stroke="#121210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M14 26 L38 14 L38 50 L14 38 Z" />
                <path d="M14 26 L14 38 L20 38 L20 26 Z" />
                <path d="M38 20 C46 24 46 40 38 44" />
              </svg>
            </div>

            {/* Icon 1: Reclaim (Scheduling) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none transition-all duration-[450ms] ${activeIconIndex === 1 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-6"}`}>
              <svg viewBox="0 0 64 64" fill="none" stroke="#121210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <rect x="12" y="16" width="40" height="36" rx="4" />
                <line x1="12" y1="26" x2="52" y2="26" />
                <line x1="22" y1="10" x2="22" y2="20" />
                <line x1="42" y1="10" x2="42" y2="20" />
              </svg>
            </div>

            {/* Icon 2: Granter (Capital Discovery) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none transition-all duration-[450ms] ${activeIconIndex === 2 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-6"}`}>
              <svg viewBox="0 0 64 64" fill="none" stroke="#121210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <rect x="16" y="10" width="32" height="44" rx="3" />
                <path d="M24 24 L30 30 L40 18" />
                <line x1="22" y1="40" x2="42" y2="40" />
                <line x1="22" y1="46" x2="36" y2="46" />
              </svg>
            </div>

            {/* Icon 3: Strategy (Planner) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none transition-all duration-[450ms] ${activeIconIndex === 3 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-6"}`}>
              <svg viewBox="0 0 64 64" fill="none" stroke="#121210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <circle cx="32" cy="32" r="20" />
                <path d="M40 24 L28 28 L24 40 L36 36 Z" fill="#121210" />
              </svg>
            </div>

            {/* Icon 4: Meetups (Networking) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none transition-all duration-[450ms] ${activeIconIndex === 4 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-6"}`}>
              <svg viewBox="0 0 64 64" fill="none" stroke="#121210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <circle cx="24" cy="28" r="9" />
                <circle cx="42" cy="28" r="9" />
                <path d="M14 50 C14 40 20 36 26 36" />
                <path d="M50 50 C50 40 44 36 38 36" />
              </svg>
            </div>

          </div>

          {/* Caption text with clean layout transitions */}
          <div className="text-center min-h-[82px] px-4">
            <h3 className={`text-lg font-bold tracking-tight text-[#EDEAE2] mb-1.5 transition-all duration-500 ease-out ${showCaption ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}>
              {capName}
            </h3>
            <p className={`text-xs text-[#8C897E] leading-relaxed max-w-sm mx-auto transition-all duration-500 ease-out ${showCaption ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}>
              {capDesc}
            </p>
          </div>

          {/* Morphing Dots Indicator (Pill-morph on active dot) */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Founders Harness capabilities">
            {shapes.map((s, idx) => (
              <button
                key={idx}
                role="tab"
                aria-label={s.name}
                onClick={() => goTo(idx)}
                className={`h-2.5 rounded-full border-none cursor-pointer p-0 transition-all duration-500 hover:bg-[#EDEAE2] ${current === idx ? "bg-[#EDEAE2] w-6" : "bg-[#2C2C27] w-2.5 hover:scale-110"
                  }`}
              />
            ))}
          </div>

        </div>

        {/* Footer Brand Label */}
        <div className="text-[9px] font-mono text-[#8C897E] uppercase tracking-widest z-10 select-none">
          Unified Memory • Secure Connectors
        </div>

      </div>

    </div>
  );
}
