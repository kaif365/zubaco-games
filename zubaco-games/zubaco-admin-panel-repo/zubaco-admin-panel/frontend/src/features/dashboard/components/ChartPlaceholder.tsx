import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";

interface ChartPlaceholderProps {
  title: string;
  type?: "bar" | "line";
  height?: number;
}

export function ChartPlaceholder({ title, type = "bar", height = 200 }: ChartPlaceholderProps) {
  const Icon = type === "bar" ? BarChart3 : TrendingUp;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 gap-2"
          style={{ height }}
        >
          <Icon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Chart coming soon</p>
          <p className="text-xs text-muted-foreground/70">Connect a charting library to render data</p>
        </div>
      </CardContent>
    </Card>
  );
}
