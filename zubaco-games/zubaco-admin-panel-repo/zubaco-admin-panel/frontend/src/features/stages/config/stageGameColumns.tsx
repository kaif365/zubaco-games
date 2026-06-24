import type { ColumnDef } from "@/types/common";
import { StageGame } from "@/types/stage";
import { formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";

export function getStageGameColumns(
  onView?: (id: string) => void,
  onDelete?: (id: string) => void,
): ColumnDef<StageGame>[] {
  return [
    {
      key: "name",
      header: "Game Name",
      cell: (row) => (
        <span className="font-semibold text-foreground">{row.name}</span>
      ),
    },
    {
      key: "created_at",
      header: "Created At",
      cell: (row) => (
        <span className="text-white">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      cell: (row) => (
        <span className="text-white">{formatDate(row.updated_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
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
            className="h-7 w-7 px-[20px] text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Remove from Stage"
            onClick={() => onDelete?.(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      width: "w-24",
    },
  ];
}
