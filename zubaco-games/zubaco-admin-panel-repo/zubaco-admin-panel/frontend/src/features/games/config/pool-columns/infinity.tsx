import { Button, buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/utils/format";
import type { ColumnDef } from "@/types/common";
import type { GameLevel } from "@/types/pool";
import { Trash2, Eye, FileJson } from "lucide-react";

export const getInfinityColumns = (
  onDelete: (id: string) => void,
  onSelectLevel: (id: string) => void,
  isDeleting: boolean,
  onViewJson?: (data: GameLevel) => void,
): ColumnDef<GameLevel>[] => [
  {
    key: "name",
    header: "Level Name",
    cell: (row) => (
      <span className="font-medium capitalize text-sm">{row.name}</span>
    ),
  },
  {
    key: "createdAt",
    header: "Created At",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.createdAt)}
      </span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated At",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.updatedAt)}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    width: "w-[150px]",
    cell: (row) => (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "h-8 gap-2",
          })}
          onClick={() => onSelectLevel(row.id)}
        >
          <Eye className="h-4 w-4" />
          <span>View Boards</span>
        </button>
        {onViewJson && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onViewJson(row)}
          >
            <FileJson className="h-4 w-4" />
            <span className="sr-only">View JSON</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(row.id)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    ),
  },
];
