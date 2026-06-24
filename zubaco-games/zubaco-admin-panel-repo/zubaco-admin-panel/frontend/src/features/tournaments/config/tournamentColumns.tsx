import type { ColumnDef } from "@/types/common";
import { Tournament } from "@/types/tournament";
import { formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";

export function getTournamentColumns(
  onView?: (id: string) => void,
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void,
): ColumnDef<Tournament>[] {
  return [
    {
      key: "name",
      header: "Tournament",
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
        </div>
      ),
    },
    {
      key: "start_date",
      header: "Start Date",
      cell: (row) => (
        <span className="text-white">
          {formatDate(row.start_date ?? row.created_at)}
        </span>
      ),
    },
    {
      key: "end_date",
      header: "End Date",
      cell: (row) => (
        <span className="text-white">
          {formatDate(row.end_date ?? row.updated_at)}
        </span>
      ),
    },
    {
      key: "stages",
      header: "Stages",
      cell: (row) => (
        <span className="text-white">
          {row.stages_count ?? row.stagesCount ?? row.stages?.length ?? 0}
        </span>
      ),
    },
    {
      key: "games",
      header: "Games",
      cell: (row) => {
        const games =
          row.games_count ??
          row.gamesCount ??
          (row.stages ?? []).reduce(
            (sum, stage) => sum + (stage.games?.length ?? 0),
            0,
          );
        return <span className="text-white">{games}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const statusRaw = (row.status ?? "DRAFT").toString();
        const status = statusRaw.toUpperCase();
        const isActive = status === "ACTIVE";
        const isDraft = status === "DRAFT";

        return (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1">
            <span
              className={[
                "h-2 w-2 rounded-full",
                isActive
                  ? "bg-emerald-500"
                  : isDraft
                    ? "bg-amber-500"
                    : "bg-white/35",
              ].join(" ")}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-white">{status}</span>
          </div>
        );
      },
    },
    {
      key: "created_at",
      header: "Created At",
      cell: (row) => (
        <span className="text-white">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 px-[20px]"
            title="View Details"
            onClick={() => onView?.(row.id)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 px-[20px]"
            title="Edit Tournament"
            onClick={() => onEdit?.(row.id)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 px-[20px] text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete Tournament"
            onClick={() => onDelete?.(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      width: "w-32",
    },
  ];
}
