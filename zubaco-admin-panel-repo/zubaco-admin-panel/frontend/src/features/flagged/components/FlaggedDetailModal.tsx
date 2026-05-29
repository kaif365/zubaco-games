"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FlagSeverityBadge,
  FlagStatusBadge,
} from "@/components/shared/StatusBadge";
import { FLAG_REASON_LABELS } from "@/constants/status";
import { formatDate } from "@/utils/format";
import type { FlaggedUser } from "@/types/flagged";
import { useUpdateFlagStatus } from "../hooks/useFlaggedUsers";

interface FlaggedDetailModalProps {
  flag: FlaggedUser | null;
  open: boolean;
  onClose: () => void;
}

export function FlaggedDetailModal({
  flag,
  open,
  onClose,
}: FlaggedDetailModalProps) {
  const { mutate: updateStatus, isPending } = useUpdateFlagStatus();

  if (!flag) return null;

  const handleAction = (action: "safe" | "suspended") => {
    updateStatus({ id: flag.id, status: action }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Flag Report Details</DialogTitle>
          <DialogDescription>
            Review the flagged activity and take action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-rose-50 text-rose-600 font-semibold">
                {flag.userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{flag.userName}</p>
              <p className="text-xs text-muted-foreground">{flag.userEmail}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailRow label="Game" value={flag.gameName} />
            <DetailRow label="Date" value={formatDate(flag.date)} />
            <DetailRow label="Reason" value={FLAG_REASON_LABELS[flag.reason]} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Severity</p>
              <FlagSeverityBadge severity={flag.severity} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <FlagStatusBadge status={flag.status} />
            </div>
            <DetailRow label="Reported By" value={flag.reportedBy ?? "—"} />
          </div>

          {/* Notes */}
          {flag.notes && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                Notes
              </p>
              <p className="text-sm">{flag.notes}</p>
            </div>
          )}
        </div>

        {flag.status === "pending" && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-emerald-600 border-emerald-200 hover:bg-transparent"
              onClick={() => handleAction("safe")}
              disabled={isPending}
            >
              Mark Safe
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("suspended")}
              disabled={isPending}
            >
              Suspend User
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
