import type { ColumnDef } from "@/types/common";
import type { User } from "@/types/user";
import { UserStatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, formatRelativeTime } from "@/utils/format";

import { Button } from "@/components/ui/button";
import { Trash2, Ban, ShieldCheck } from "lucide-react";

export function getUserColumns(
  onDelete?: (id: string) => void,
  onBan?: (id: string) => void,
  onUnban?: (id: string) => void,
): ColumnDef<User>[] {
  return [
    {
      key: "name",
      header: "User",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
              {row.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground text-sm">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "gamesPlayed",
      header: "Games Played",
      cell: (row) => (
        <span className="font-medium tabular-nums">{row.gamesPlayed}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <UserStatusBadge status={row.status} />,
    },
    {
      key: "joinDate",
      header: "Join Date",
      cell: (row) => (
        <span className="text-sm text-white">{formatDate(row.joinDate)}</span>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      cell: (row) => (
        <span className="text-sm text-white">
          {formatRelativeTime(row.lastActive)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {row.status === "suspended" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 px-[20px] text-green-500 hover:text-green-600 hover:bg-green-500/10"
              title="Unban User"
              onClick={() => onUnban?.(row.id)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 px-[20px] text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
              title="Ban User"
              onClick={() => onBan?.(row.id)}
            >
              <Ban className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 px-[20px] text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete User"
            onClick={() => onDelete?.(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      width: "w-10",
    },
  ];
}

export const USER_STATUS_FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "flagged", label: "Flagged" },
  { value: "suspended", label: "Suspended" },
];
