import type { ColumnDef } from "@/types/common";
import type { FlaggedUser } from "@/types/flagged";
import {
  FlagSeverityBadge,
  FlagStatusBadge,
} from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FLAG_REASON_LABELS } from "@/constants/status";
import { formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface GetFlaggedColumnsOptions {
  onAction: (row: FlaggedUser, action: "review" | "safe" | "suspend") => void;
  onViewDetail: (row: FlaggedUser) => void;
  isPending?: (id: string) => boolean;
}

export function getFlaggedColumns({
  onAction,
  onViewDetail,
  isPending,
}: GetFlaggedColumnsOptions): ColumnDef<FlaggedUser>[] {
  return [
    {
      key: "user",
      header: "User",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[10px] bg-rose-50 text-rose-600 font-semibold">
              {row.userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground text-sm">
              {row.userName}
            </p>
            <p className="text-xs text-muted-foreground">{row.userEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "game",
      header: "Game",
      cell: (row) => <span className="text-sm text-white">{row.gameName}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <span className="text-sm">{FLAG_REASON_LABELS[row.reason]}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => <FlagSeverityBadge severity={row.severity} />,
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-sm text-white">{formatDate(row.date)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <FlagStatusBadge status={row.status} />,
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
            onClick={() => onViewDetail(row)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {row.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-transparent"
                disabled={isPending?.(row.id)}
                onClick={() => onAction(row, "safe")}
              >
                Mark Safe
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/5"
                disabled={isPending?.(row.id)}
                onClick={() => onAction(row, "suspend")}
              >
                Suspend
              </Button>
            </>
          )}
        </div>
      ),
      width: "min-w-[200px]",
    },
  ];
}

export const FLAG_STATUS_FILTER_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "safe", label: "Safe" },
  { value: "suspended", label: "Suspended" },
];

export const FLAG_SEVERITY_FILTER_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
