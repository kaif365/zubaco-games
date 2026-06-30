/**
 * Unified Admin Control Plane (ADMIN-001..004 foundation).
 *
 * Admin operations orchestrate the authoritative platform pipelines (tournament
 * orchestrator, wallet ledger, anti-cheat enforcement, event bus) instead of
 * mutating real-money tables directly. Every action is role-checked (RBAC,
 * least privilege), idempotent (requestId), and appended to an immutable audit
 * trail with full actor/target/outcome context.
 */
export enum AdminRole {
  READ_ONLY = 'READ_ONLY',
  SUPPORT = 'SUPPORT',
  OPERATOR = 'OPERATOR',
  FINANCE = 'FINANCE',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum AdminAction {
  ADVANCE_STAGE = 'ADVANCE_STAGE',
  RESOLVE_REWARDS = 'RESOLVE_REWARDS',
  DISTRIBUTE_REWARDS = 'DISTRIBUTE_REWARDS',
  CREDIT_WALLET = 'CREDIT_WALLET',
  REVERSE_PAYOUT = 'REVERSE_PAYOUT',
  ENFORCE_ANTI_CHEAT = 'ENFORCE_ANTI_CHEAT',
  MARK_FOR_REVIEW = 'MARK_FOR_REVIEW',
}

/** Least-privilege map: each role may invoke only its listed actions. */
export const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminAction>> = {
  [AdminRole.READ_ONLY]: new Set(),
  [AdminRole.SUPPORT]: new Set([AdminAction.MARK_FOR_REVIEW]),
  [AdminRole.OPERATOR]: new Set([AdminAction.ADVANCE_STAGE, AdminAction.RESOLVE_REWARDS, AdminAction.MARK_FOR_REVIEW]),
  [AdminRole.FINANCE]: new Set([AdminAction.CREDIT_WALLET, AdminAction.REVERSE_PAYOUT, AdminAction.DISTRIBUTE_REWARDS]),
  [AdminRole.SUPER_ADMIN]: new Set([
    AdminAction.ADVANCE_STAGE,
    AdminAction.RESOLVE_REWARDS,
    AdminAction.DISTRIBUTE_REWARDS,
    AdminAction.CREDIT_WALLET,
    AdminAction.REVERSE_PAYOUT,
    AdminAction.ENFORCE_ANTI_CHEAT,
    AdminAction.MARK_FOR_REVIEW,
  ]),
};

export interface AdminContext {
  adminId: string;
  role: AdminRole;
}

export interface AdminCommand {
  action: AdminAction;
  /** Stable idempotency / correlation id for the request. */
  requestId: string;
  target: string;
  reason: string;
  params?: Record<string, unknown>;
}

export interface AdminAuditEntry {
  requestId: string;
  adminId: string;
  role: AdminRole;
  action: AdminAction;
  target: string;
  reason: string;
  outcome: 'OK' | 'DENIED' | 'DUPLICATE' | 'ERROR';
  at: string;
}

export interface AdminResult {
  ok: boolean;
  duplicate: boolean;
  outcome: AdminAuditEntry['outcome'];
  data?: unknown;
}
