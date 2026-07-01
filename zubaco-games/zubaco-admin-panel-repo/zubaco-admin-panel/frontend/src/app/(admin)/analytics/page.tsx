"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart } from "@/components/charts/SimpleCharts";
import {
  fetchAnalyticsOverview,
  fetchUserGrowth,
  fetchRevenue,
  fetchGamePopularity,
  fetchRetention,
} from "@/lib/api/endpoints/analytics";

const inr = (n: number) => `₹${Math.round(n).toLocaleString()}`;
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function AnalyticsPage() {
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: fetchAnalyticsOverview,
  });
  const userGrowth = useQuery({
    queryKey: ["analytics", "user-growth", 30],
    queryFn: () => fetchUserGrowth(30),
  });
  const revenue = useQuery({
    queryKey: ["analytics", "revenue", 30],
    queryFn: () => fetchRevenue(30),
  });
  const popularity = useQuery({
    queryKey: ["analytics", "game-popularity"],
    queryFn: fetchGamePopularity,
  });
  const retention = useQuery({
    queryKey: ["analytics", "retention"],
    queryFn: fetchRetention,
  });

  const isFetching =
    overview.isFetching ||
    userGrowth.isFetching ||
    revenue.isFetching ||
    popularity.isFetching ||
    retention.isFetching;

  const refreshAll = () => {
    overview.refetch();
    userGrowth.refetch();
    revenue.refetch();
    popularity.refetch();
    retention.refetch();
  };

  const o = overview.data;

  return (
    <PageContainer>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Analytics"
          description="Platform-wide analytics, user engagement, and revenue metrics."
        />
        <Button variant="outline" size="sm" onClick={refreshAll} loading={isFetching}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {overview.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Failed to load analytics. {(overview.error as Error)?.message}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Daily Active Users" value={overview.isLoading ? null : o?.dau ?? 0} hint="Logged in today" />
          <MetricCard label="Monthly Active Users" value={overview.isLoading ? null : o?.mau ?? 0} hint="Logged in this month" />
          <MetricCard
            label="Revenue (MTD)"
            value={overview.isLoading ? null : o?.month_revenue ?? 0}
            hint="Deposits this month"
            format={inr}
          />
          <MetricCard
            label="D7 Retention"
            value={retention.isLoading ? null : retention.data?.d7_retention ?? 0}
            hint="7-day return rate"
            format={(n) => `${n}%`}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">User Growth (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowth.isLoading ? (
              <ChartSkeleton />
            ) : userGrowth.isError ? (
              <ChartError message={(userGrowth.error as Error)?.message} />
            ) : (
              <LineChart
                data={(userGrowth.data ?? []).map((d) => ({ label: shortDate(d.date), value: d.signups }))}
                emptyLabel="No signups in this period"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Game Popularity</CardTitle>
          </CardHeader>
          <CardContent>
            {popularity.isLoading ? (
              <ChartSkeleton />
            ) : popularity.isError ? (
              <ChartError message={(popularity.error as Error)?.message} />
            ) : (
              <BarChart
                data={(popularity.data ?? []).map((g) => ({ label: g.game_type, value: g.total_plays }))}
                emptyLabel="No game sessions recorded"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.isLoading ? (
              <ChartSkeleton />
            ) : revenue.isError ? (
              <ChartError message={(revenue.error as Error)?.message} />
            ) : (
              <LineChart
                data={(revenue.data ?? []).map((r) => ({ label: shortDate(r.date), value: r.total }))}
                valueFormatter={inr}
                emptyLabel="No revenue in this period"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Platform Totals</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Totals label="Total Users" value={(o?.total_users ?? 0).toLocaleString()} />
                <Totals label="Total Sessions" value={(o?.total_sessions ?? 0).toLocaleString()} />
                <Totals label="Sessions Today" value={(o?.today_sessions ?? 0).toLocaleString()} />
                <Totals label="Active Seasons" value={(o?.active_seasons ?? 0).toLocaleString()} />
                <Totals label="Total Revenue" value={inr(o?.total_revenue ?? 0)} />
                <Totals label="D30 Retention" value={`${retention.data?.d30_retention ?? 0}%`} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function MetricCard({
  label,
  value,
  hint,
  format = (n: number) => n.toLocaleString(),
}: {
  label: string;
  value: number | null;
  hint: string;
  format?: (n: number) => string;
}) {
  return (
    <div className="rounded-md border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="mt-2 text-3xl font-bold">{value === null ? "…" : format(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Totals({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-56 w-full animate-pulse rounded-md bg-muted/40" />;
}

function ChartError({ message }: { message?: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-destructive/40 text-sm text-destructive">
      {message || "Failed to load chart data"}
    </div>
  );
}
