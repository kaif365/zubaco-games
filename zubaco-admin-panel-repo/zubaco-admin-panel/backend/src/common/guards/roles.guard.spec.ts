import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AdminRole } from '../enums/admin-role.enum';
import { REQUEST_CONTEXT } from '../constants';

describe('RolesGuard - 4-Tier RBAC & Audit Stream (Module 6.6)', () => {
    let guard: RolesGuard;
    let mockReflector: Reflector;
    let mockRedis: any;
    let redisClient: any;

    beforeEach(() => {
        redisClient = {
            lpush: jest.fn().mockResolvedValue(1),
            ltrim: jest.fn().mockResolvedValue('OK'),
        };

        mockRedis = {
            getClient: jest.fn().mockReturnValue(redisClient),
        };

        mockReflector = {
            getAllAndOverride: jest.fn(),
        } as unknown as Reflector;

        guard = new RolesGuard(mockReflector, mockRedis);
    });

    const createMockContext = (adminRole?: AdminRole, headerRole?: string): ExecutionContext => {
        const req: any = {
            headers: headerRole ? { 'x-admin-role': headerRole } : {},
            method: 'POST',
            url: '/admin/financial/approve-payout',
            ip: '192.168.1.10',
            [REQUEST_CONTEXT.SESSION]: { userId: 'admin-123' },
            [REQUEST_CONTEXT.ADMIN]: adminRole ? { id: 'admin-123', role: adminRole } : undefined,
        };

        return {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => req,
            }),
        } as unknown as ExecutionContext;
    };

    describe('Route Decoration Logic', () => {
        it('should allow access if route has no @RequireRoles decorator', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

            const context = createMockContext(AdminRole.OPERATIONS_MANAGER);
            const canActivate = await guard.canActivate(context);

            expect(canActivate).toBe(true);
        });
    });

    describe('SuperAdmin Unrestricted Execution Gate', () => {
        it('should allow SUPER_ADMIN unrestricted access to Finance-restricted routes', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([AdminRole.FINANCE_CONTROLLER]);

            const context = createMockContext(AdminRole.SUPER_ADMIN);
            const canActivate = await guard.canActivate(context);

            expect(canActivate).toBe(true);
            expect(redisClient.lpush).toHaveBeenCalledWith(
                'admin:audit',
                expect.stringContaining('GRANTED_SUPER_ADMIN'),
            );
        });
    });

    describe('Operations Manager Scope Restriction', () => {
        it('should allow OPERATIONS_MANAGER access to operations routes', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([
                AdminRole.OPERATIONS_MANAGER,
                AdminRole.SUPER_ADMIN,
            ]);

            const context = createMockContext(AdminRole.OPERATIONS_MANAGER);
            const canActivate = await guard.canActivate(context);

            expect(canActivate).toBe(true);
        });

        it('should throw ForbiddenException when OPERATIONS_MANAGER attempts to access Finance routes', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([AdminRole.FINANCE_CONTROLLER]);

            const context = createMockContext(AdminRole.OPERATIONS_MANAGER);

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
            expect(redisClient.lpush).toHaveBeenCalledWith(
                'admin:audit',
                expect.stringContaining('DENIED_INSUFFICIENT_ROLE'),
            );
        });
    });

    describe('Compliance Agent Scope Restriction', () => {
        it('should allow COMPLIANCE_AGENT access to KYC verification routes', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([AdminRole.COMPLIANCE_AGENT]);

            const context = createMockContext(AdminRole.COMPLIANCE_AGENT);
            const canActivate = await guard.canActivate(context);

            expect(canActivate).toBe(true);
        });

        it('should throw ForbiddenException when COMPLIANCE_AGENT attempts to access Operations routes', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([AdminRole.OPERATIONS_MANAGER]);

            const context = createMockContext(AdminRole.COMPLIANCE_AGENT);

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('Finance Controller Scope Restriction', () => {
        it('should allow FINANCE_CONTROLLER access to Tax and Ledger routes', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([AdminRole.FINANCE_CONTROLLER]);

            const context = createMockContext(AdminRole.FINANCE_CONTROLLER);
            const canActivate = await guard.canActivate(context);

            expect(canActivate).toBe(true);
        });

        it('should throw ForbiddenException when FINANCE_CONTROLLER attempts to access Compliance routes', async () => {
            (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([AdminRole.COMPLIANCE_AGENT]);

            const context = createMockContext(AdminRole.FINANCE_CONTROLLER);

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        });
    });
});
