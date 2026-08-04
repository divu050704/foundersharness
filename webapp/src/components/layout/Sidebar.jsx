"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, ShoppingCart, Settings, BarChart3, Shield } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Shield className="size-5 text-primary" />
          <span className="text-base font-bold tracking-tight text-foreground uppercase">
            Founders Harness
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-none",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="size-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 rounded bg-secondary p-3">
          <div className="size-8 rounded bg-background flex items-center justify-center font-bold text-foreground text-xs">
            AD
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Admin User</p>
            <p className="text-[10px] text-muted-foreground">admin@harness.io</p>
          </div>
        </div>
      </div>
    </div>
  );
}
