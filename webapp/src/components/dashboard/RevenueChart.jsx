"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useState, useEffect } from "react";

const data = [
  { name: "Jan", revenue: 4000 },
  { name: "Feb", revenue: 3000 },
  { name: "Mar", revenue: 5000 },
  { name: "Apr", revenue: 4500 },
  { name: "May", revenue: 6000 },
  { name: "Jun", revenue: 5500 },
  { name: "Jul", revenue: 7000 },
];

export default function RevenueChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="col-span-4 border border-border bg-card h-[350px] flex items-center justify-center rounded shadow-none">
        <p className="text-muted-foreground text-xs font-mono tracking-widest uppercase">Loading chart...</p>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 border border-border bg-card rounded shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground uppercase">Revenue Overview</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Monthly performance metrics for this fiscal year.</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{ 
                background: "var(--card)", 
                borderColor: "var(--border)", 
                borderRadius: "var(--radius)", 
                color: "var(--foreground)",
                fontSize: "12px"
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--primary)"
              strokeWidth={1.5}
              fill="var(--primary)"
              fillOpacity={0.05} // flat desaturated fill with no gradient
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
