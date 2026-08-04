import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import RecentOrders from "@/components/dashboard/RecentOrders";
import { DollarSign, Users, ShoppingBag, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, Admin. Here is your dashboard analytics summary.
        </p>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$45,231.89"
          description="from last month"
          icon={DollarSign}
          trend="+20.1%"
        />
        <StatCard
          title="Active Users"
          value="+2,350"
          description="since last week"
          icon={Users}
          trend="+180.1%"
        />
        <StatCard
          title="New Sales"
          value="+12,234"
          description="since yesterday"
          icon={ShoppingBag}
          trend="+19%"
        />
        <StatCard
          title="Conversion Rate"
          value="4.8%"
          description="compared to yesterday"
          icon={TrendingUp}
          trend="-2.4%"
        />
      </div>

      {/* Analytics Chart and Table */}
      <div className="grid gap-6 md:grid-cols-7">
        <RevenueChart />
        <RecentOrders />
      </div>
    </div>
  );
}
