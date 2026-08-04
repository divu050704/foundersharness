"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6 text-card-foreground">
      <div className="flex flex-1 items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden rounded hover:bg-secondary">
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
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="size-8 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="relative size-8 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 bg-primary" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative size-8 rounded p-0 hover:bg-secondary">
              <Avatar className="size-8 rounded">
                <AvatarImage src="" alt="Admin" className="rounded" />
                <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold rounded">AD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded border border-border bg-card shadow-none" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none text-foreground">Admin User</p>
                <p className="text-[10px] leading-none text-muted-foreground">admin@harness.io</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-xs hover:bg-secondary rounded p-2 cursor-pointer">Profile Settings</DropdownMenuItem>
            <DropdownMenuItem className="text-xs hover:bg-secondary rounded p-2 cursor-pointer">Billing</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-xs text-destructive font-semibold hover:bg-destructive/10 rounded p-2 cursor-pointer">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
