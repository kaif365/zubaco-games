import { Badge } from "@/components/ui/badge";
import {
  GAME_STATUS_CONFIG,
  USER_STATUS_CONFIG,
  FLAG_SEVERITY_CONFIG,
  FLAG_STATUS_CONFIG,
} from "@/constants/status";
import type { GameStatus } from "@/types/game";
import type { UserStatus } from "@/types/user";
import type { FlagSeverity, FlagStatus } from "@/types/flagged";

export function GameStatusBadge({ status }: { status: GameStatus }) {
  const config = GAME_STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = USER_STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function FlagSeverityBadge({ severity }: { severity: FlagSeverity }) {
  const config = FLAG_SEVERITY_CONFIG[severity];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function FlagStatusBadge({ status }: { status: FlagStatus }) {
  const config = FLAG_STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
