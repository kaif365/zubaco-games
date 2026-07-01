"use client";

/**
 * Lightweight, dependency-free chart primitives rendered with inline SVG / CSS.
 * The admin panel has no charting library in its dependency set, so these keep
 * the bundle unchanged while still visualising real backend data.
 */

export interface ChartDatum {
  label: string;
  value: number;
}

interface ChartProps {
  data: ChartDatum[];
  height?: number;
  color?: string;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}

const DEFAULT_COLOR = "var(--color-primary, #6C3CE1)";

function defaultFormat(value: number): string {
  return value.toLocaleString();
}

/** Simple responsive line chart with an area fill and end-point markers. */
export function LineChart({
  data,
  height = 220,
  color = DEFAULT_COLOR,
  valueFormatter = defaultFormat,
  emptyLabel = "No data available",
}: ChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart height={height} label={emptyLabel} />;
  }

  const width = 100; // viewBox units; SVG scales to container width
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : width / 2;
    const y = 100 - (d.value / max) * 92 - 4; // padding top/bottom
    return { x, y, datum: d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

  return (
    <div style={{ height }} className="w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Line chart"
      >
        <path d={areaPath} fill={color} opacity={0.12} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.2} fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{data[0].label}</span>
        <span className="font-medium text-foreground">
          Peak {valueFormatter(max)}
        </span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

/** Horizontal bar chart — ideal for categorical data such as game types. */
export function BarChart({
  data,
  height = 220,
  color = DEFAULT_COLOR,
  valueFormatter = defaultFormat,
  emptyLabel = "No data available",
}: ChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart height={height} label={emptyLabel} />;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ minHeight: height }} className="w-full space-y-2 overflow-y-auto" >
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-muted-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-muted/40">
            <div
              className="h-full rounded-sm transition-all"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color, opacity: 0.85 }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-medium text-foreground">
            {valueFormatter(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ height, label }: { height: number; label: string }) {
  return (
    <div
      style={{ height }}
      className="flex items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground"
    >
      {label}
    </div>
  );
}
