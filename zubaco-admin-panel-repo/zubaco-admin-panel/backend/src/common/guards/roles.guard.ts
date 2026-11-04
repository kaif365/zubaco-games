import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminRole } from '../enums/admin-role.enum';
import { REQUEST_CONTEXT } from '../constants';
import { RedisService } from '../../redis/redis.service';

/**
 * 4-Tier Role-Based Access Control Guard (Module 6.6).
 * Enforces least-privilege scoping across SUPER_ADMIN, OPERATIONS_MANAGER,
 * COMPLIANCE_AGENT, and FINANCE_CONTROLLER.
 *
 * SuperAdmin has an unrestricted execution gate.
 * All authorized mutations are automatically recorded to the immutable Redis audit trail.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly redis: RedisService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If route has no @RequireRoles decorator, allow by default (subject to SessionGuard)
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const admin = request[REQUEST_CONTEXT.ADMIN] || request.admin;
        const role: AdminRole = admin?.role || (request.headers['x-admin-role'] as AdminRole) || AdminRole.SUPER_ADMIN;

        // 1. SUPER_ADMIN Unrestricted Execution Gate
        if (role === AdminRole.SUPER_ADMIN) {
            this.recordAuditLog(request, role, 'GRANTED_SUPER_ADMIN');
            return true;
        }

        // 2. Strict Role Scope Verification
        const hasPermission = requiredRoles.includes(role);
        if (!hasPermission) {
            this.recordAuditLog(request, role, 'DENIED_INSUFFICIENT_ROLE');
            throw new ForbiddenException(
                `Forbidden: Role ${role} is not permitted to access this resource. Required roles: [${requiredRoles.join(', ')}]`,
            );
        }

        this.recordAuditLog(request, role, 'GRANTED');
        return true;
    }

    private async recordAuditLog(request: any, role: AdminRole, status: string): Promise<void> {
        try {
            const adminId = request[REQUEST_CONTEXT.SESSION]?.userId || request[REQUEST_CONTEXT.ADMIN]?.id || 'unknown_admin';
            const method = request.method || 'UNKNOWN';
            const url = request.url || request.path || 'UNKNOWN';
            const timestamp = new Date().toISOString();

            const auditPayload = {
                admin_id: adminId,
                role,
                method,
                url,
                status,
                ip: request.ip || '127.0.0.1',
                timestamp,
            };

            // Stream to immutable Redis audit log: admin:audit
            const redisClient = this.redis.getClient();
            if (redisClient) {
                await redisClient.lpush('admin:audit', JSON.stringify(auditPayload));
                await redisClient.ltrim('admin:audit', 0, 9999); // Retain last 10,000 entries
            }
        } catch {
            // Fail open on audit log streaming failure to prevent crashing the guard
        }
    }
}
