import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService - KYC Verification Desk (Module 6.3)', () => {
    let service: UsersService;
    let mockPrisma: any;
    let mockS3: any;

    beforeEach(() => {
        mockS3 = {
            createPresignedDownload: jest.fn().mockResolvedValue('https://zubaco-s3.amazonaws.com/kyc/doc123.jpg?X-Amz-Signature=xyz'),
        };

        mockPrisma = {
            user: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
                count: jest.fn(),
            },
            wallet: {
                upsert: jest.fn(),
                findUnique: jest.fn(),
                updateMany: jest.fn(),
            },
            notification: {
                create: jest.fn(),
            },
            auditLog: {
                create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(mockPrisma)),
        };

        service = new UsersService(mockPrisma, mockS3);
    });

    describe('KYC Review Queue', () => {
        it('should return paginated pending unverified users', async () => {
            const pendingUsers = [
                {
                    id: 'usr-1',
                    username: 'player_one',
                    display_name: 'Player One',
                    email: 'one@zubaco.com',
                    phone: '+919999999991',
                    is_verified: false,
                    wallet: { id: 'w-1', balance: 500, kyc_verified: false },
                },
            ];

            mockPrisma.user.findMany.mockResolvedValue(pendingUsers);
            mockPrisma.user.count.mockResolvedValue(1);

            const result = await service.getKycReviewQueue(1, 20);

            expect(result.queue).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                where: { deleted_at: null, is_verified: false },
                skip: 0,
                take: 20,
                orderBy: { created_at: 'asc' },
                select: expect.any(Object),
            });
        });
    });

    describe('Private S3 Presigned Document Preview URL', () => {
        it('should throw BadRequestException if documentKey is missing or invalid', async () => {
            await expect(service.getKycDocumentPreviewUrl('')).rejects.toThrow(BadRequestException);
            await expect(service.getKycDocumentPreviewUrl(null as any)).rejects.toThrow(BadRequestException);
        });

        it('should generate a 5-minute presigned preview URL for private S3 document inspection', async () => {
            const result = await service.getKycDocumentPreviewUrl('kyc/usr-1/aadhaar_front.jpg', 300);

            expect(mockS3.createPresignedDownload).toHaveBeenCalledWith('kyc/usr-1/aadhaar_front.jpg', 300);
            expect(result.preview_url).toContain('https://zubaco-s3.amazonaws.com');
            expect(result.expires_in_seconds).toBe(300);
            expect(result.document_key).toBe('kyc/usr-1/aadhaar_front.jpg');
        });
    });

    describe('Approve KYC & Immediate Withdrawal Unlock', () => {
        it('should throw NotFoundException if user does not exist', async () => {
            mockPrisma.user.findFirst.mockResolvedValue(null);

            await expect(service.approveKyc('nonexistent-usr')).rejects.toThrow(NotFoundException);
        });

        it('should verify user, unlock wallet withdrawals, dispatch notification, and record audit', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'usr-1' });

            const result = await service.approveKyc('usr-1', 'admin-super-01');

            expect(result.success).toBe(true);
            expect(result.kyc_verified).toBe(true);
            expect(result.withdrawals_unlocked).toBe(true);

            // User marked verified
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'usr-1' },
                data: { is_verified: true },
            });

            // Wallet kyc_verified set to true to unlock withdrawals
            expect(mockPrisma.wallet.upsert).toHaveBeenCalledWith({
                where: { user_id: 'usr-1' },
                update: { kyc_verified: true },
                create: {
                    user_id: 'usr-1',
                    kyc_verified: true,
                    balance: 0,
                    bonus_balance: 0,
                    currency: 'INR',
                },
            });

            // In-app notification sent
            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: {
                    user_id: 'usr-1',
                    type: 'SYSTEM',
                    title: 'KYC Verification Approved',
                    body: expect.stringContaining('Real-money withdrawals are now fully unlocked'),
                },
            });

            // Audit log created
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: {
                    admin_id: 'admin-super-01',
                    action: 'APPROVE_KYC',
                    entity: 'users',
                    entity_id: 'usr-1',
                    changes: { kyc_verified: true, status: 'VERIFIED' },
                },
            });
        });
    });

    describe('Reject KYC with Mandatory Reason Code', () => {
        it('should throw NotFoundException if user does not exist', async () => {
            mockPrisma.user.findFirst.mockResolvedValue(null);

            await expect(service.rejectKyc('nonexistent-usr', 'BLURRY_IMAGE', 'Cannot read PAN number')).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if reason code or message is missing', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'usr-1' });

            await expect(service.rejectKyc('usr-1', '', 'Cannot read PAN number')).rejects.toThrow(BadRequestException);
            await expect(service.rejectKyc('usr-1', 'BLURRY_IMAGE', '')).rejects.toThrow(BadRequestException);
        });

        it('should lock withdrawals, dispatch detailed rejection notification, and record audit', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'usr-1' });

            const result = await service.rejectKyc('usr-1', 'NAME_MISMATCH', 'PAN name does not match registered name', 'admin-comp-02');

            expect(result.success).toBe(true);
            expect(result.kyc_verified).toBe(false);
            expect(result.rejection_code).toBe('NAME_MISMATCH');

            // User marked unverified
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'usr-1' },
                data: { is_verified: false },
            });

            // Wallet kyc_verified set to false (locked withdrawals)
            expect(mockPrisma.wallet.upsert).toHaveBeenCalledWith({
                where: { user_id: 'usr-1' },
                update: { kyc_verified: false },
                create: {
                    user_id: 'usr-1',
                    kyc_verified: false,
                    balance: 0,
                    bonus_balance: 0,
                    currency: 'INR',
                },
            });

            // Rejection notification sent with structured code
            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: {
                    user_id: 'usr-1',
                    type: 'SYSTEM',
                    title: 'KYC Verification Rejected',
                    body: expect.stringContaining('[Reason: NAME_MISMATCH]'),
                    data: { reason_code: 'NAME_MISMATCH', reason_message: 'PAN name does not match registered name' },
                },
            });

            // Audit log created
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: {
                    admin_id: 'admin-comp-02',
                    action: 'REJECT_KYC',
                    entity: 'users',
                    entity_id: 'usr-1',
                    changes: {
                        kyc_verified: false,
                        status: 'REJECTED',
                        reason_code: 'NAME_MISMATCH',
                        reason_message: 'PAN name does not match registered name',
                    },
                },
            });
        });
    });
});
