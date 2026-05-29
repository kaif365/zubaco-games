import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/format";
import type { ColumnDef } from "@/types/common";
import type { GenericGameBoard } from "@/types/pool";
import { FileJson, LayoutGrid, Trash2 } from "lucide-react";

export function getSudokuColumns(
  onDelete: (id: string) => void,
  isDeleting: boolean,
  onViewJson?: (data: GenericGameBoard) => void,
): ColumnDef<GenericGameBoard>[] {
  return [
    {
      key: "name",
      header: "Board Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary/60" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "grid",
      header: "Grid Size",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.gridX} x {row.gridY}
        </span>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      cell: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.level?.name || "N/A"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Added On",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.createdAt ?? row.created_at ?? null)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-[80px]",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {onViewJson && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewJson(row)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <FileJson className="h-4 w-4" />
              <span className="sr-only">View JSON</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
    },
  ];
}
