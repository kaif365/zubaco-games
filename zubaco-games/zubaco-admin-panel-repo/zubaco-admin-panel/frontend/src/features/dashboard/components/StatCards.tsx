"use client";

import { Gamepad2, Users, Activity, ShieldAlert } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { useDashboardStats } from "../hooks/useDashboard";

export function StatCards() {
  const { data, isLoading } = useDashboardStats();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total Games"
        value={data?.totalGames ?? 0}
        growth={data?.gamesGrowth}
        icon={Gamepad2}
        iconColor="text-primary"
        isLoading={isLoading}
      />
      <StatCard
        title="Total Users"
        value={data?.totalUsers ?? 0}
        growth={data?.usersGrowth}
        icon={Users}
        iconColor="text-sky-500"
        isLoading={isLoading}
      />
      <StatCard
        title="Active Users"
        value={data?.activeUsers ?? 0}
        growth={data?.activeUsersGrowth}
        icon={Activity}
        iconColor="text-emerald-500"
        isLoading={isLoading}
      />
      <StatCard
        title="Flagged Users"
        value={data?.flaggedUsers ?? 0}
        growth={data?.flaggedGrowth}
        icon={ShieldAlert}
        iconColor="text-rose-500"
        isLoading={isLoading}
      />
    </div>
  );
}
