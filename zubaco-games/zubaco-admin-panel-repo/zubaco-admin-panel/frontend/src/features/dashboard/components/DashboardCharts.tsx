"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, BarChart } from "@/components/charts/SimpleCharts";
import { fetchUserGrowth, fetchGamePopularity } from "@/lib/api/endpoints/analytics";

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.getDate()}/${d.getMonth() + 1}`;
};

/**
 * Real dashboard charts backed by the admin analytics endpoints.
 * Replaces the former static "chart coming soon" placeholders.
 */
export function DashboardCharts() {
  const growth = useQuery({
    queryKey: ["dashboard", "chart", "user-growth", 14],
    queryFn: () => fetchUserGrowth(14),
  });
  const popularity = useQuery({
    queryKey: ["dashboard", "chart", "game-popularity"],
    queryFn: fetchGamePopularity,
  });

  const isFetching = growth.isFetching || popularity.isFetching;
  const refresh = () => {
    growth.refetch();
    popularity.refetch();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refresh} loading={isFetching}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">User Growth (14d)</CardTitle>
          </CardHeader>
          <CardContent>
            {growth.isLoading ? (
              <ChartSkeleton />
            ) : growth.isError ? (
              <ChartError message={(growth.error as Error)?.message} />
            ) : (
              <LineChart
                data={(growth.data ?? []).map((d) => ({ label: shortDate(d.date), value: d.signups }))}
                emptyLabel="No signups in this period"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Games Activity</CardTitle>
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
      </div>
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
