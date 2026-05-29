import type { ColumnDef } from "@/types/common";
import { Stage } from "@/types/stage";
import { formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Eye, Pencil, Trash2 } from "lucide-react";

export function getStageColumns(
  onView?: (id: string) => void,
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void,
): ColumnDef<Stage>[] {
  return [
    {
      key: "stage_number",
      header: "Stage No.",
      cell: (row) => (
        <span className="font-medium tabular-nums text-foreground">
          {row.stage_number}
        </span>
      ),
      width: "w-24",
    },
    {
      key: "stage_name",
      header: "Stage Name",
      cell: (row) => (
        <span className="font-semibold text-foreground">{row.stage_name}</span>
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
      key: "tournaments",
      header: "Assigned Tournaments",
      cell: (row) => {
        const tournaments = row.tournaments ?? [];
        if (tournaments.length === 0) {
          return <span className="text-muted-foreground">None</span>;
        }

        const [first, ...rest] = tournaments;
        const remaining = rest.length;
        const label =
          remaining > 0 ? `${first.name} +${remaining}` : first.name;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-border bg-background px-3 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="w-32 truncate">{label}</span>
                <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="max-h-60 w-60 overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {rest.length ? (
                rest.map((tournament) => (
                  <DropdownMenuItem key={tournament.id} className="text-sm">
                    {tournament.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="text-sm text-muted-foreground">
                  No other tournaments
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div
          className="flex items-center justify-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 px-[20px]"
            title="View"
            onClick={() => onView?.(row.id)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 px-[20px]"
              title="Edit"
              onClick={() => onEdit(row.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 px-[20px] text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Remove from tournament"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
      width: onDelete || onEdit ? "w-32" : "w-16",
    },
  ];
}
