"use client";

import {
  Bell,
  ChevronDown,
  Loader2,
  Menu,
  Monitor,
  Moon,
  Power,
  Search,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { isAudioEnabled, toggleAudio } from "@/lib/retroAudio";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState({
    name: "Admin User",
    email: "admin@harness.io",
    avatar: "AD",
  });

  // Browser Session states
  const [activeSession, setActiveSession] = useState("default");
  const [helperConnected, setHelperConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [browserSessions, setBrowserSessions] = useState([]);

  const checkStatus = useCallback(async () => {
    try {
      const hookRes = await api.get("/social/hook-status");
      setHelperConnected(hookRes.connected);

      if (hookRes.connected) {
        const sessionRes = await api.get("/social/active-session");
        setActiveSession(sessionRes.activeSessionName || "default");
      }
    } catch (e) {
      console.error("Failed to check session status in navbar:", e);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const userJson = localStorage.getItem("founder_user");
    if (userJson) {
      try {
        setUser(JSON.parse(userJson));
      } catch (e) {
        console.error(e);
      }
    }

    checkStatus();
    // Also fetch saved browser sessions
    fetchBrowserSessions();
    // Poll hook/session status every 8 seconds to stay in sync
    const interval = setInterval(() => { checkStatus(); fetchBrowserSessions(); }, 8000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const switchSession = async (sessionName) => {
    if (sessionName === "close") {
      setLoading(true);
      try {
        await api.post("/social/close-browser");
        setActiveSession("default");
        toast.success("Browser closed successfully.");
      } catch (_err) {
        toast.error("Failed to close browser.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (sessionName === "custom") {
      const customName = prompt("Enter custom session profile name:", "");
      if (!customName || !customName.trim()) return;
      sessionName = customName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    setLoading(true);
    try {
      const res = await api.post("/social/launch-browser", { sessionName });
      if (res.success) {
        setActiveSession(sessionName);
        toast.success(`Browser session switched to: ${sessionName}`);
      } else {
        toast.error(res.message || "Failed to launch session.");
      }
    } catch (_err) {
      toast.error("Request failed. Is the browser helper online?");
    } finally {
      setLoading(false);
    }
  };

  // Fetch custom browser session names from backend
  const fetchBrowserSessions = async () => {
    try {
      const res = await api.get("/social/browser-sessions");
      // Expecting an array of session names
      if (Array.isArray(res)) {
        setBrowserSessions(res);
      } else {
        setBrowserSessions([]);
      }
    } catch (e) {
      console.error("Failed to fetch browser sessions", e);
      setBrowserSessions([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("founder_user");
    window.location.href = "/login";
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6 text-card-foreground">
      <div className="flex flex-1 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded hover:bg-secondary"
        >
          <Menu className="size-4" />
        </Button>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-background border border-border rounded pl-8.5 pr-4 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Global Browser Session Switcher Dropdown */}
        {mounted && (
          <div className="mr-2">
            {helperConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="flex items-center gap-1.5 h-8 px-2.5 text-xs bg-secondary/20 border-border hover:bg-secondary text-foreground font-medium rounded-lg"
                  >
                    {loading ? (
                      <Loader2 className="size-3 animate-spin text-primary" />
                    ) : (
                      <Monitor className="size-3.5 text-primary animate-pulse" />
                    )}
                    <span className="max-w-[90px] truncate font-mono text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                      {activeSession}
                    </span>
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded border border-border bg-card shadow-none"
                  align="end"
                >
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground p-2">
                    Browser Session Profiles
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  {/* Default session */}
                  <DropdownMenuItem
                    onClick={() => switchSession("default")}
                    className={`text-xs p-2 rounded cursor-pointer ${
                      activeSession === "default"
                        ? "bg-primary/10 text-primary font-semibold"
                        : ""
                    }`}
                  >
                    default
                  </DropdownMenuItem>

                  {/* Custom saved sessions */}
                  {browserSessions
                    .filter((s) => s !== "default")
                    .map((session) => (
                      <DropdownMenuItem
                        key={session}
                        onClick={() => switchSession(session)}
                        className={`text-xs p-2 rounded cursor-pointer ${
                          activeSession === session
                            ? "bg-primary/10 text-primary font-semibold"
                            : ""
                        }`}
                      >
                        {session}
                      </DropdownMenuItem>
                    ))}

                  {/* Launch custom profile */}
                  <DropdownMenuItem
                    onClick={() => switchSession("custom")}
                    className="text-xs p-2 rounded cursor-pointer italic text-muted-foreground hover:text-foreground font-medium"
                  >
                    + Launch Custom Profile...
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border" />

                  {/* Close browser */}
                  <DropdownMenuItem
                    onClick={() => switchSession("close")}
                    className="text-xs text-rose-500 font-semibold p-2 rounded cursor-pointer hover:bg-rose-500/10 flex items-center gap-1.5"
                  >
                    <Power className="size-3.5" />
                    Close Browser Window
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 h-8 rounded border border-border bg-secondary/10 text-muted-foreground/60 text-[10px] font-bold select-none cursor-not-allowed">
                <Monitor className="size-3.5 opacity-40" />
                <span>Helper Offline</span>
              </div>
            )}
          </div>
        )}

        {mounted && (
          <div className="flex items-center gap-1.5">
            {/* Retro Sound FX Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const current = isAudioEnabled();
                toggleAudio(!current);
                toast.info(`Retro Sound FX: ${!current ? "ENABLED 🔊" : "DISABLED 🔇"}`);
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-mono"
              title="Toggle Retro Sound Effects"
            >
              {isAudioEnabled() ? "🔊 SFX ON" : "🔇 SFX OFF"}
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="size-8 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-primary" />
              )}
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 bg-primary" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative size-8 rounded p-0 hover:bg-secondary"
            >
              <Avatar className="size-8 rounded">
                <AvatarImage src="" alt={user.name} className="rounded" />
                <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold rounded uppercase">
                  {user.avatar}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded border border-border bg-card shadow-none"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-[10px] leading-none text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-xs hover:bg-secondary rounded p-2 cursor-pointer">
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs hover:bg-secondary rounded p-2 cursor-pointer">
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-destructive font-semibold hover:bg-destructive/10 rounded p-2 cursor-pointer"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
