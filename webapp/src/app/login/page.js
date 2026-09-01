"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles, Shield, Terminal, ArrowRight, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { playRetroSound } from "@/lib/retroAudio";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [demoUser, setDemoUser] = useState({
    name: "Michael Scott",
    email: "michael.scott@dundermifflin.com",
    avatar: "MS",
    role: "Regional Manager / Chief Founder Co-pilot"
  });

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    playRetroSound("blip");

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `/api/user`,
      });
    } catch (error) {
      console.error("Google authentication error:", error);
      toast.error("Google Sign-In failed. Switching to demo access.");
      setIsAuthenticating(false);
    }
  };

  const handleLogin = (userToLogin = demoUser) => {
    setIsAuthenticating(true);
    playRetroSound("chime");

    setTimeout(() => {
      localStorage.setItem("founder_user", JSON.stringify(userToLogin));
      localStorage.setItem("founder_onboarded", "true");
      router.push("/dashboard");
    }, 600);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full bg-[#0f1419] text-[#f3f4f6] font-mono overflow-hidden select-none">
      
      {/* LEFT PANEL: Dunder Mifflin Employee Security Clearance Form */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 md:p-14 bg-[#141a22] border-r-4 border-[#2e3e50] relative overflow-hidden">
        
        {/* 1. Header Stamp */}
        <div className="z-10 space-y-4">
          <div className="flex items-center justify-between text-[9px] font-pixel text-[#f59e0b] uppercase tracking-widest">
            <span>FOUNDER HARNESS // VOL. 01</span>
            <span>SECURE HQ ENTRY</span>
          </div>

          <div className="border-b-2 border-[#2e3e50] pb-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded bg-[#f59e0b]/20 border-2 border-[#f59e0b] flex items-center justify-center font-pixel text-[#f59e0b] text-sm shadow">
                FH
              </div>
              <div>
                <h1 className="font-pixel text-lg text-[#f3f4f6] uppercase tracking-wide">
                  FOUNDER HARNESS
                </h1>
                <p className="text-xs text-[#f59e0b] font-mono font-bold tracking-wider uppercase">
                  Multi-Agent AI HQ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Login Badge & Action Panel */}
        <div className="z-10 py-6 space-y-6 max-w-md w-full">
          <div className="bg-[#19222d] border-2 border-[#2e3e50] p-4 rounded-lg space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#2e3e50] pb-2">
              <span className="font-pixel text-[10px] text-[#f59e0b] uppercase">
                SECURITY CLEARANCE: LEVEL 4
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-vt323 uppercase">
                ● GOD AGENT READY
              </span>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">Welcome back, Startup Founder.</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Authenticate via Google OAuth or local demo clearance to preside over Michael, Dwight, Jim, Pam & team.
              </p>
            </div>

            {/* Quote of the Day */}
            <div className="bg-[#0f1419] border border-[#2e3e50] p-2.5 rounded text-[10px] text-[#f59e0b]/90 italic">
              "Would I rather be feared or loved? Easy. Both. I want people to be afraid of how much they love me." — Michael Scott
            </div>
          </div>

          {/* Login Actions */}
          <div className="space-y-3">
            {/* Google OAuth Trigger */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full bg-[#24303e] hover:bg-[#2c3b4e] text-white font-mono text-xs py-2.5 px-4 rounded border border-[#2e3e50] flex items-center justify-center gap-2 cursor-pointer transition-all font-semibold"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="size-4 text-[#f59e0b] animate-spin" />
                  <span>AUTHENTICATING WITH GOOGLE...</span>
                </>
              ) : (
                <>
                  <span>Continue with Google OAuth</span>
                </>
              )}
            </button>

            {/* Main Demo Action */}
            <button
              type="button"
              onClick={() => handleLogin(demoUser)}
              disabled={isAuthenticating}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-pixel text-xs py-3 px-4 rounded border-2 border-[#f59e0b] shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 uppercase font-bold"
            >
              {isAuthenticating ? (
                <>
                  <Sparkles className="size-4 animate-spin" />
                  <span>INITIALIZING OFFICE FLOOR...</span>
                </>
              ) : (
                <>
                  <Building2 className="size-4" />
                  <span>ENTER AS MICHAEL SCOTT (CO-PILOT)</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>

            {/* Secondary login options */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleLogin({
                  name: "Dwight Schrute",
                  email: "dwight.schrute@dundermifflin.com",
                  avatar: "DS",
                  role: "Capital & Grants Scout"
                })}
                className="bg-[#18202a] hover:bg-[#24303e] text-slate-300 border border-[#2e3e50] font-mono text-[10px] py-2 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Login as Dwight (Grants)</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin({
                  name: "Pam Beesly",
                  email: "pam.beesly@dundermifflin.com",
                  avatar: "PB",
                  role: "Social Media Calendar Builder"
                })}
                className="bg-[#18202a] hover:bg-[#24303e] text-slate-300 border border-[#2e3e50] font-mono text-[10px] py-2 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Login as Pam (Social)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Footer Stamp */}
        <div className="z-10 border-t-2 border-[#2e3e50] pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>LOC: [SCRANTON_BRANCH_FL1]</div>
          <div>DUNDER_MIFflin: [VER_2.5_OK]</div>
        </div>

      </div>

      {/* RIGHT PANEL: Retro Agent Roster & Floor Preview */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 bg-[#0c0f12] relative overflow-hidden">
        
        {/* Header */}
        <div className="z-10 flex items-center justify-between border-b border-[#2e3e50] pb-4">
          <div className="flex items-center gap-2 font-pixel text-xs text-[#f59e0b]">
            <Terminal className="size-4" />
            <span>FOUNDER HARNESS SQUAD</span>
          </div>
          <span className="text-xs font-mono text-slate-400">8 Autonomous CLI Agents</span>
        </div>

        {/* Showcase Agent Grid Preview */}
        <div className="z-10 grid grid-cols-2 gap-4 my-auto max-w-2xl mx-auto w-full">
          
          <div className="bg-[#141a22] border-2 border-[#f59e0b]/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-[#f59e0b]">👑 Michael Scott</span>
              <span className="text-[9px] bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 px-1.5 py-0.5 rounded font-vt323">GOD AGENT</span>
            </div>
            <p className="text-xs text-slate-300">Claude 3.7 Sonnet (Orchestrator)</p>
            <p className="text-[10px] text-slate-400 font-mono italic">
              "Delegates founder tasks to social, grant & meetup subagents."
            </p>
          </div>

          <div className="bg-[#141a22] border-2 border-emerald-500/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-emerald-400">💰 Dwight Schrute</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-vt323">GRANTS & VCS</span>
            </div>
            <p className="text-xs text-slate-300">Grok-3 (Strict Verification)</p>
            <p className="text-[10px] text-slate-400 font-mono italic">
              "Scouts non-dilutive NSF grants & AWS $100K startup credits."
            </p>
          </div>

          <div className="bg-[#141a22] border-2 border-pink-500/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-pink-400">📱 Pam & Jim</span>
              <span className="text-[9px] bg-pink-500/20 text-pink-400 border border-pink-500/40 px-1.5 py-0.5 rounded font-vt323">SOCIAL AUTOMATOR</span>
            </div>
            <p className="text-xs text-slate-300">Gemini 2.5 Flash & Device-Hook</p>
            <p className="text-[10px] text-slate-400 font-mono italic">
              "Builds 7-day social calendars & posts via browser sessions."
            </p>
          </div>

          <div className="bg-[#141a22] border-2 border-purple-500/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-purple-400">🤝 Ryan Howard</span>
              <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/40 px-1.5 py-0.5 rounded font-vt323">MEETUP SCOUT</span>
            </div>
            <p className="text-xs text-slate-300">Claude 3.5 Haiku</p>
            <p className="text-[10px] text-slate-400 font-mono italic">
              "Discovers local tech events, pitch competitions & VC socials."
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="z-10 flex items-center justify-between border-t border-[#2e3e50] pt-4 text-[10px] text-slate-500">
          <span>MEMPALACE VECTOR STORE: ACTIVE</span>
          <span>DEVICE-HOOK CDP BROWSER: CONNECTED</span>
        </div>

      </div>

    </div>
  );
}
