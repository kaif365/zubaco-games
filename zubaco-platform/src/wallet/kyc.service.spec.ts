import { BadRequestException } from '@nestjs/common';
import { KycService } from './kyc.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('KycService (Identity Pipeline & Document Security)', () => {
  let service: KycService;
  let mockPrisma: any;

  beforeEach(() => {
    process.env.KYC_ENCRYPTION_KEY = 'test-kyc-aes-256-gcm-master-key-32-chars';

    mockPrisma = {
      kycDocument: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    service = new KycService(mockPrisma as unknown as PrismaService);
  });

  describe('Document Format Validation', () => {
    it('accepts valid Indian PAN format (5 letters, 4 digits, 1 letter)', () => {
      expect(() => service.validateDocumentFormat('PAN', 'ABCDE1234F')).not.toThrow();
      expect(() => service.validateDocumentFormat('PAN', 'abcde1234f')).not.toThrow();
    });

    it('rejects invalid PAN formats with BadRequestException', () => {
      expect(() => service.validateDocumentFormat('PAN', '12345ABCDE')).toThrow(BadRequestException);
      expect(() => service.validateDocumentFormat('PAN', 'ABCDE12345')).toThrow(BadRequestException);
      expect(() => service.validateDocumentFormat('PAN', 'ABCD1234F')).toThrow(BadRequestException);
    });

    it('accepts valid 12-digit Aadhaar number', () => {
      expect(() => service.validateDocumentFormat('AADHAAR', '123456789012')).not.toThrow();
      expect(() => service.validateDocumentFormat('AADHAAR', '1234 5678 9012')).not.toThrow();
    });

    it('rejects invalid Aadhaar number (non-12 digits or letters)', () => {
      expect(() => service.validateDocumentFormat('AADHAAR', '12345678901')).toThrow(BadRequestException);
      expect(() => service.validateDocumentFormat('AADHAAR', '1234567890123')).toThrow(BadRequestException);
      expect(() => service.validateDocumentFormat('AADHAAR', '12345678901A')).toThrow(BadRequestException);
    });
  });

  describe('AES-256-GCM Encryption at Rest', () => {
    it('encrypts and decrypts sensitive document numbers accurately', () => {
      const pan = 'ABCDE1234F';
      const encrypted = service.encryptData(pan);

      // Verify format: iv:tag:ciphertext
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(encrypted).not.toContain(pan);

      const decrypted = service.decryptData(encrypted);
      expect(decrypted).toBe(pan);
    });
  });

  describe('Document Masking', () => {
    it('masks PAN preserving first 5 and last 1 characters', () => {
      expect(service.maskDocumentNumber('PAN', 'ABCDE1234F')).toBe('ABCDE****F');
    });

    it('masks Aadhaar preserving only last 4 digits', () => {
      expect(service.maskDocumentNumber('AADHAAR', '123456789012')).toBe('XXXX-XXXX-9012');
    });
  });

  describe('Presigned Private S3 Upload URLs', () => {
    it('generates presigned upload URL with exactly 5-minute (300s) expiration', async () => {
      const res = await service.generatePresignedUploadUrl('user-1', 'PAN', 'png');

      expect(res.expiresInSeconds).toBe(300);
      expect(res.fileKey).toMatch(/^kyc\/user-1\/pan_\d+\.png$/);
      expect(res.uploadUrl).toContain('amazonaws.com');
      expect(res.uploadUrl).toContain('expires=');
      expect(res.uploadUrl).toContain('sig=');
    });
  });

  describe('Document Submission & Approval Flow', () => {
    it('encrypts document number when storing in database', async () => {
      mockPrisma.kycDocument.findFirst.mockResolvedValue(null);
      mockPrisma.kycDocument.create.mockImplementation((args: any) => Promise.resolve(args.data));

      const doc = await service.submitDocument(
        'user-1',
        'PAN',
        'https://s3.amazonaws.com/doc.png',
        'ABCDE1234F',
      );

      expect(doc.document_number).toBeDefined();
      expect(doc.document_number).not.toBe('ABCDE1234F');
      expect(doc.status).toBe('PENDING');
    });

    it('approves document and marks wallet kyc_verified to true', async () => {
      mockPrisma.kycDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        user_id: 'user-1',
      });

      const res = await service.approveDocument('doc-1', 'admin-1');
      expect(res).toEqual({ success: true });
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        data: { kyc_verified: true },
      });
    });
  });
});
