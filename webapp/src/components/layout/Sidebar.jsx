"use client";

import {
  BarChart3,
  Building2,
  Settings,
  Shield,
  ShoppingCart,
  Users,
  Share2,
  Brain,
  Award,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { playRetroSound } from "@/lib/retroAudio";

const navigation = [
  { name: "Office Floor 🏢", href: "/dashboard", icon: Building2 },
  { name: "Business Memory", href: "/dashboard/memory", icon: Brain },
  { name: "Social Media", href: "/dashboard/social", icon: Share2 },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState({ name: "Admin User", email: "admin@harness.io", avatar: "AD" });

  useEffect(() => {
    const userJson = localStorage.getItem("founder_user");
    if (!userJson) {
      window.location.href = "/login";
      return;
    }
    try {
      setUser(JSON.parse(userJson));
    } catch (e) {
      console.error(e);
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground font-mono">
      {/* Brand Header with Founder Harness Style */}
      <div className="flex flex-col justify-center px-6 py-4 border-b border-border bg-card">
        <Link
          href="/dashboard"
          onClick={() => playRetroSound("click")}
          className="flex items-center gap-2 font-semibold"
        >
          <div className="size-7 rounded bg-amber-500/20 border border-amber-500 flex items-center justify-center font-pixel text-amber-500 text-xs shadow">
            FH
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-pixel tracking-wider text-foreground uppercase">
              Founder Harness
            </span>
            <span className="text-[9px] font-mono text-amber-500/90 font-bold uppercase tracking-widest">
              Multi-Agent AI HQ
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-5">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => playRetroSound("click")}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-xs font-mono font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-sm border border-primary/50"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent",
              )}
            >
              <item.icon className="size-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Office Floor Stats Badge */}
      <div className="px-4 py-3 border-t border-border bg-secondary/30">
        <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-amber-500 font-bold">
            <span className="flex items-center gap-1 font-pixel text-[9px]">
              <Sparkles className="size-3" /> HQ STATUS
            </span>
            <span>ONLINE</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            8 CLI Agents Active on Floor 1. Michael Scott presiding.
          </p>
        </div>
      </div>

      {/* Admin User Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 rounded bg-secondary p-2.5">
          <div className="size-8 rounded bg-background flex items-center justify-center font-bold text-foreground text-xs uppercase border border-border">
            {user.avatar}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-foreground truncate max-w-[130px]">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

