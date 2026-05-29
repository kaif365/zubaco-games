import type { ColumnDef } from "@/types/common";
import type { Game, GameStatus } from "@/types/game";
import { formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye } from "lucide-react";

export function getGameColumns(
  onView?: (id: string) => void,
  onStatusChange?: (id: string, status: Extract<GameStatus, "active" | "inactive">) => void,
  updatingStatusGameId?: string | null,
): ColumnDef<Game>[] {
  return [
    {
      key: "name",
      header: "Game Name",
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created At",
      cell: (row) => (
        <span className="text-sm text-white">
          {formatDate(row.createdAt ?? row.lastUpdated)}
        </span>
      ),
    },
    {
      key: "lastUpdated",
      header: "Last Updated",
      cell: (row) => (
        <span className="text-sm text-white">
          {formatDate(row.lastUpdated)}
        </span>
      ),
    },
    {
      key: "totalLevels",
      header: "Assigned Stages",
      cell: (row) => (
        <span className="font-medium tabular-nums">{row.totalLevels}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const isActive = row.status === "active";
        const value = isActive ? "active" : "inactive";
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={value}
              disabled={updatingStatusGameId === row.id}
              onValueChange={(next) =>
                onStatusChange?.(
                  row.id,
                  next === "active" ? "active" : "inactive",
                )
              }
            >
              <SelectTrigger className="h-8 w-[132px] rounded-full bg-muted/30 text-xs font-medium">
                <span
                  className={[
                    "mr-2 h-2 w-2 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-white/35",
                  ].join(" ")}
                  aria-hidden="true"
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
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
        </div>
      ),
      width: "w-20",
    },
  ];
}
