import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminAction, AdminRole } from '../admin.types';

/**
 * Wire contract for the admin control-plane HTTP entry point.
 *
 * The admin console authenticates the human operator on its own side, then
 * invokes the platform as a trusted, signed service (ServiceIdentityGuard),
 * forwarding the acting admin's identity + role here. The control-plane service
 * re-checks RBAC (ROLE_PERMISSIONS) authoritatively — the role on the wire is
 * an assertion that is independently enforced, never trusted blindly.
 */
export class ExecuteAdminCommandDto {
  /** Acting admin identity (forwarded by the admin console). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  adminId: string;

  /** Acting admin role — re-validated against ROLE_PERMISSIONS server-side. */
  @IsEnum(AdminRole)
  role: AdminRole;

  /** Authoritative action to dispatch. */
  @IsEnum(AdminAction)
  action: AdminAction;

  /** Stable idempotency / correlation id. Replays return DUPLICATE. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  requestId: string;

  /** Subject of the action (tournament id, user id, …). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  target: string;

  /** Mandatory human-readable justification (recorded in the audit trail). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  reason: string;

  /** Action-specific parameters (amount, sessionId, actions, …). */
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
