import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber, formatGrowth } from "@/utils/format";

interface StatCardProps {
  title: string;
  value: number;
  growth?: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  growth,
  icon: Icon,
  iconColor = "text-primary",
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3.5 w-16" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = growth !== undefined && growth >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const iconBgByColor: Record<string, string> = {
    "text-primary": "bg-primary/10",
    "text-sky-500": "bg-sky-500/10",
    "text-emerald-500": "bg-emerald-500/10",
    "text-rose-500": "bg-rose-500/10",
  };
  const iconBgClass = iconBgByColor[iconColor] ?? "bg-primary/10";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              iconBgClass,
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">
          {formatNumber(value)}
        </p>
        {growth !== undefined && (
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-emerald-600" : "text-rose-600",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {formatGrowth(Math.abs(growth))} vs last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
