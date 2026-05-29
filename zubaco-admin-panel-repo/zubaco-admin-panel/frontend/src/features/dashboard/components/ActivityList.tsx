"use client";

import {
  UserPlus,
  Gamepad2,
  ShieldAlert,
  UserX,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/utils/format";
import { useRecentActivity } from "../hooks/useDashboard";
import type { ActivityItem } from "@/types/dashboard";
import { cn } from "@/utils/cn";

const ACTIVITY_ICON_MAP: Record<
  ActivityItem["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  user_joined: { icon: UserPlus, color: "text-sky-600", bg: "bg-sky-50" },
  game_updated: { icon: Gamepad2, color: "text-primary", bg: "bg-primary/10" },
  user_flagged: { icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50" },
  user_suspended: { icon: UserX, color: "text-rose-600", bg: "bg-rose-50" },
  game_added: { icon: PlusCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
};

export function ActivityList() {
  const { data, isLoading } = useRecentActivity();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-6 py-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.map((item) => {
              const { icon: Icon, color, bg } = ACTIVITY_ICON_MAP[item.type];
              return (
                <li key={item.id} className="flex items-start gap-3 px-6 py-4 hover:bg-muted/40 transition-colors">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", bg)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
