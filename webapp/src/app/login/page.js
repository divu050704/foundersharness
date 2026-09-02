"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Terminal, ArrowRight, Loader2, Lock } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { playRetroSound } from "@/lib/retroAudio";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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
      toast.error("Google Sign-In failed. Please try again.");
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full bg-background text-foreground font-mono overflow-hidden select-none">
      
      {/* LEFT PANEL: Founder Harness Secure Login */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 md:p-14 bg-card border-r-2 border-border relative overflow-hidden">
        
        {/* 1. Header Stamp */}
        <div className="z-10 space-y-4">
          <div className="flex items-center justify-between text-[9px] font-pixel text-primary uppercase tracking-widest">
            <span>FOUNDER HARNESS // VOL. 01</span>
            <span>SECURE HQ ENTRY</span>
          </div>

          <div className="border-b-2 border-border pb-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded bg-primary/20 border-2 border-primary flex items-center justify-center font-pixel text-primary text-sm shadow">
                FH
              </div>
              <div>
                <h1 className="font-pixel text-lg text-foreground uppercase tracking-wide">
                  FOUNDER HARNESS
                </h1>
                <p className="text-xs text-primary font-mono font-bold tracking-wider uppercase">
                  Multi-Agent AI HQ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Login Card */}
        <div className="z-10 py-6 space-y-6 max-w-md w-full my-auto">
          <div className="bg-muted/40 border-2 border-border p-5 rounded-lg space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="font-pixel text-[10px] text-primary uppercase flex items-center gap-1.5 font-bold">
                <Lock className="size-3 text-primary" />
                SECURITY GATEWAY: LEVEL 4
              </span>
              <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 text-[9px] px-2 py-0.5 rounded font-vt323 uppercase font-bold">
                ● FLEET ONLINE
              </span>
            </div>

            <div className="text-xs text-foreground/90 space-y-1.5">
              <p className="font-bold text-foreground text-sm font-sans">Welcome back, Startup Founder.</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Authenticate with your Google account to access your autonomous AI executive team, persistent long-term memory store, and local browser automation engine.
              </p>
            </div>

            {/* Quote of the Day */}
            <div className="bg-background border border-border p-3 rounded text-[10px] text-primary/90 italic">
              "Great execution is not about doing everything yourself; it is about building an unstoppable team." — Startup Founder Motto
            </div>
          </div>

          {/* Single Secure Google OAuth Action */}
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-pixel text-xs py-6 px-5 rounded-lg border-2 border-primary shadow-lg flex items-center justify-center gap-3 cursor-pointer transition-all uppercase font-bold text-center"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="size-4 animate-spin text-primary-foreground" />
                  <span>AUTHENTICATING WITH GOOGLE...</span>
                </>
              ) : (
                <>
                  <Shield className="size-4" />
                  <span>SIGN IN WITH GOOGLE OAUTH</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              OAuth 2.0 SSL Encrypted Connection
            </p>
          </div>
        </div>

        {/* 3. Footer Stamp */}
        <div className="z-10 border-t-2 border-border pt-4 flex items-center justify-between text-[10px] text-muted-foreground">
          <div>LOC: [MAIN_HQ_FL1]</div>
          <div>FOUNDER_HARNESS: [VER_2.5_OK]</div>
        </div>

      </div>

      {/* RIGHT PANEL: Retro Agent Roster & Floor Preview */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 bg-background relative overflow-hidden">
        
        {/* Header */}
        <div className="z-10 flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 font-pixel text-xs text-primary">
            <Terminal className="size-4" />
            <span>FOUNDER HARNESS SQUAD</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">8 Autonomous CLI Agents</span>
        </div>

        {/* Showcase Agent Grid Preview */}
        <div className="z-10 grid grid-cols-2 gap-4 my-auto max-w-2xl mx-auto w-full">
          
          <div className="bg-card border-2 border-primary/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-primary font-bold">👑 Alex Rivera</span>
              <span className="text-[9px] bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded font-vt323 font-bold">GOD AGENT</span>
            </div>
            <p className="text-xs text-foreground/90 font-bold">Orchestrator Core</p>
            <p className="text-[10px] text-muted-foreground font-mono italic">
              "Delegates founder tasks to social, grant & meetup subagents."
            </p>
          </div>

          <div className="bg-card border-2 border-emerald-500/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-emerald-500 font-bold">💰 Victor Stone</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 px-1.5 py-0.5 rounded font-vt323 font-bold">GRANTS & VCS</span>
            </div>
            <p className="text-xs text-foreground/90 font-bold">Capital & Grants Core</p>
            <p className="text-[10px] text-muted-foreground font-mono italic">
              "Scouts non-dilutive NSF grants & AWS $100K startup credits."
            </p>
          </div>

          <div className="bg-card border-2 border-pink-500/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-pink-500 font-bold">📱 Sophia & Lucas</span>
              <span className="text-[9px] bg-pink-500/20 text-pink-500 border border-pink-500/40 px-1.5 py-0.5 rounded font-vt323 font-bold">SOCIAL AUTOMATOR</span>
            </div>
            <p className="text-xs text-foreground/90 font-bold">Social Automation & Device-Hook</p>
            <p className="text-[10px] text-muted-foreground font-mono italic">
              "Builds 7-day social calendars & posts via browser sessions."
            </p>
          </div>

          <div className="bg-card border-2 border-purple-500/50 p-4 rounded-lg shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-purple-500 font-bold">🤝 Roman Cole</span>
              <span className="text-[9px] bg-purple-500/20 text-purple-500 border border-purple-500/40 px-1.5 py-0.5 rounded font-vt323 font-bold">MEETUP SCOUT</span>
            </div>
            <p className="text-xs text-foreground/90 font-bold">Networking & Events Core</p>
            <p className="text-[10px] text-muted-foreground font-mono italic">
              "Discovers local tech events, pitch competitions & VC socials."
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="z-10 flex items-center justify-between border-t border-border pt-4 text-[10px] text-muted-foreground">
          <span>MEMPALACE VECTOR STORE: ACTIVE</span>
          <span>DEVICE-HOOK CDP BROWSER: CONNECTED</span>
        </div>

      </div>

    </div>
  );
}
