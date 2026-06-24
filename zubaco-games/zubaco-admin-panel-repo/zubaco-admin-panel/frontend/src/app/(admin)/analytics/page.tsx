'use client';

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  fetchAnalyticsOverview,
  fetchUserGrowth,
  fetchGamePopularity,
  type OverviewStats,
  type UserGrowthItem,
  type GamePopularityItem,
} from "@/lib/api/endpoints/analytics";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthItem[]>([]);
  const [gamePopularity, setGamePopularity] = useState<GamePopularityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [stats, growth, games] = await Promise.all([
          fetchAnalyticsOverview(),
          fetchUserGrowth(30),
          fetchGamePopularity(),
        ]);
        if (stats) setOverview(stats);
        if (growth) setUserGrowth(growth);
        if (games) setGamePopularity(games);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Platform-wide analytics, user engagement, and revenue metrics."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">DAU</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : (overview?.dau?.toLocaleString() ?? "-")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Daily Active Users</p>
        </div>
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">MAU</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : (overview?.mau?.toLocaleString() ?? "-")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Monthly Active Users</p>
        </div>
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Revenue (MTD)</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : `₹${(overview?.revenue_mtd ?? 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Month to date</p>
        </div>
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Retention (D7)</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : (overview?.retention_d7 != null ? `${overview.retention_d7}%` : "-")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">7-day retention rate</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-card border p-6">
          <h2 className="text-lg font-semibold mb-4">User Growth</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {loading ? (
              "Loading..."
            ) : userGrowth.length > 0 ? (
              <div className="w-full text-sm">
                <p className="text-center mb-2">
                  {userGrowth.length} days of data &middot; {userGrowth.reduce((s, d) => s + d.registrations, 0).toLocaleString()} total registrations
                </p>
                <p className="text-center text-xs text-muted-foreground">Chart: Registrations over time</p>
              </div>
            ) : (
              "No user growth data available"
            )}
          </div>
        </div>
        <div className="rounded-xl bg-card border p-6">
          <h2 className="text-lg font-semibold mb-4">Game Popularity</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {loading ? (
              "Loading..."
            ) : gamePopularity.length > 0 ? (
              <div className="w-full text-sm">
                <p className="text-center mb-2">
                  {gamePopularity.length} games &middot; {gamePopularity.reduce((s, g) => s + g.play_count, 0).toLocaleString()} total plays
                </p>
                <p className="text-center text-xs text-muted-foreground">Chart: Games by play count</p>
              </div>
            ) : (
              "No game popularity data available"
            )}
          </div>
        </div>
        <div className="rounded-xl bg-card border p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Breakdown</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chart: Entry fees, deposits, withdrawals
          </div>
        </div>
        <div className="rounded-xl bg-card border p-6">
          <h2 className="text-lg font-semibold mb-4">Drop-off Rates</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chart: Stage completion funnel
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
