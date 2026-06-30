import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ServiceIdentityGuard } from '../../auth/service-identity/service-identity.guard';
import { AdminControlPlaneService } from './admin-control-plane.service';
import { ExecuteAdminCommandDto } from './dto/admin-command.dto';
import { AdminAuditEntry, AdminContext, AdminCommand, AdminResult } from './admin.types';

/**
 * HTTP entry point for the authoritative admin control plane (ROLLOUT-001).
 *
 * Every admin mutation reaches the platform through this single guarded route
 * → AdminControlPlaneService.execute(), which RBAC-gates, deduplicates, audits,
 * and delegates to the tournament orchestrator, wallet ledger, anti-cheat
 * enforcement and event bus. There is no direct real-money table path.
 *
 * Service-to-service authentication is enforced by ServiceIdentityGuard (signed
 * x-service-id / x-timestamp / x-nonce / x-signature). The admin console
 * authenticates the human operator and forwards adminId + role; the role is
 * re-verified server-side against ROLE_PERMISSIONS.
 *
 * Mounted at /api/v1/admin/control-plane (global prefix api/v1).
 */
@Controller('admin/control-plane')
@UseGuards(ServiceIdentityGuard)
export class AdminControlPlaneController {
  constructor(private readonly controlPlane: AdminControlPlaneService) {}

  /** Execute a single authoritative admin command. */
  @Post('execute')
  async execute(@Body() body: ExecuteAdminCommandDto): Promise<AdminResult> {
    const ctx: AdminContext = { adminId: body.adminId, role: body.role };
    const cmd: AdminCommand = {
      action: body.action,
      requestId: body.requestId,
      target: body.target,
      reason: body.reason,
      params: body.params,
    };
    return this.controlPlane.execute(ctx, cmd);
  }

  /** Read-only view of the immutable admin audit trail (most-recent first). */
  @Get('audit')
  async audit(@Query('limit') limit?: string): Promise<AdminAuditEntry[]> {
    const parsed = limit !== undefined ? parseInt(limit, 10) : undefined;
    return this.controlPlane.getAuditTrail(Number.isFinite(parsed) ? (parsed as number) : 50);
  }
}
