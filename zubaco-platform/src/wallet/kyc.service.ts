import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { KycDocType } from '.prisma/client';
import { config } from '../config';
import * as crypto from 'crypto';

@Injectable()
export class KycService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly prisma: PrismaService) {
    const rawSecret = process.env.KYC_ENCRYPTION_KEY || config.jwt.accessSecret;
    this.encryptionKey = crypto.createHash('sha256').update(rawSecret).digest();
  }

  // ─── AES-256-GCM ENCRYPTION AT REST ─────────────────────────────

  encryptData(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptData(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText; // Fallback if plain
    const [ivHex, tagHex, cipherHex] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  maskDocumentNumber(docType: KycDocType, docNumber: string): string {
    if (!docNumber) return '';
    const clean = docNumber.trim();
    if (docType === 'PAN') {
      if (clean.length === 10) {
        return `${clean.slice(0, 5)}****${clean.slice(9)}`;
      }
      return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
    }
    if (docType === 'AADHAAR') {
      if (clean.length === 12) {
        return `XXXX-XXXX-${clean.slice(8)}`;
      }
      return `XXXX-XXXX-${clean.slice(-4)}`;
    }
    return `****${clean.slice(-4)}`;
  }

  validateDocumentFormat(docType: KycDocType, documentNumber: string): void {
    const clean = documentNumber.trim();
    if (docType === 'PAN') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(clean.toUpperCase())) {
        throw new BadRequestException(
          'Invalid PAN number. Must be 10 characters in standard format (e.g. ABCDE1234F).',
        );
      }
    } else if (docType === 'AADHAAR') {
      const aadhaarRegex = /^\d{12}$/;
      if (!aadhaarRegex.test(clean.replace(/\s+/g, ''))) {
        throw new BadRequestException('Invalid Aadhaar number. Must be a 12-digit numeric identifier.');
      }
    }
  }

  // ─── PRESIGNED PRIVATE S3 URLS ─────────────────────────────────

  async generatePresignedUploadUrl(
    userId: string,
    docType: KycDocType,
    fileExtension = 'jpg',
  ): Promise<{ uploadUrl: string; fileKey: string; expiresInSeconds: number }> {
    const fileKey = `kyc/${userId}/${docType.toLowerCase()}_${Date.now()}.${fileExtension}`;
    const expiresInSeconds = 300; // 5-minute expiry

    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(`${userId}:${fileKey}:${expiresAt}`)
      .digest('hex');

    const bucket = config.aws?.s3Bucket || 'zubaco-kyc-documents';
    const region = config.aws?.region || 'ap-south-1';
    const uploadUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}?expires=${expiresAt}&sig=${token}`;

    return {
      uploadUrl,
      fileKey,
      expiresInSeconds,
    };
  }

  // ─── SUBMIT KYC DOCUMENT ───────────────────────────────────────

  async submitDocument(userId: string, docType: KycDocType, documentUrl: string, documentNumber?: string) {
    if (documentNumber) {
      this.validateDocumentFormat(docType, documentNumber);
    }

    // Check if already submitted and pending/approved
    const existing = await this.prisma.kycDocument.findFirst({
      where: { user_id: userId, document_type: docType, status: { in: ['PENDING', 'APPROVED'] } },
    });

    if (existing?.status === 'APPROVED') {
      throw new BadRequestException(`${docType} is already verified`);
    }

    if (existing?.status === 'PENDING') {
      throw new BadRequestException(`${docType} is already submitted and pending review`);
    }

    const encryptedNumber = documentNumber ? this.encryptData(documentNumber.trim().toUpperCase()) : undefined;

    return this.prisma.kycDocument.create({
      data: {
        user_id: userId,
        document_type: docType,
        document_number: encryptedNumber,
        document_url: documentUrl,
        status: 'PENDING',
      },
    });
  }

  // ─── GET USER KYC STATUS ───────────────────────────────────────

  async getKycStatus(userId: string) {
    const documents = await this.prisma.kycDocument.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
      select: { kyc_verified: true },
    });

    return {
      kyc_verified: wallet?.kyc_verified || false,
      documents: documents.map((d) => {
        let maskedNumber: string | null = null;
        if (d.document_number) {
          try {
            const decrypted = this.decryptData(d.document_number);
            maskedNumber = this.maskDocumentNumber(d.document_type, decrypted);
          } catch {
            maskedNumber = this.maskDocumentNumber(d.document_type, d.document_number);
          }
        }
        return {
          id: d.id,
          type: d.document_type,
          status: d.status,
          masked_number: maskedNumber,
          rejection_reason: d.rejection_reason,
          submitted_at: d.created_at,
        };
      }),
    };
  }

  // ─── ADMIN: REVIEW KYC ────────────────────────────────────────

  async approveDocument(documentId: string, adminId: string) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.$transaction([
      this.prisma.kycDocument.update({
        where: { id: documentId },
        data: { status: 'APPROVED', reviewed_by: adminId, reviewed_at: new Date() },
      }),
      this.prisma.wallet.update({
        where: { user_id: doc.user_id },
        data: { kyc_verified: true },
      }),
    ]);

    return { success: true };
  }

  async rejectDocument(documentId: string, adminId: string, reason: string) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        rejection_reason: reason,
        reviewed_by: adminId,
        reviewed_at: new Date(),
      },
    });

    return { success: true };
  }

  // ─── ADMIN: GET PENDING KYC QUEUE ─────────────────────────────

  async getPendingQueue(page = 1, limit = 20) {
    const [docs, total] = await Promise.all([
      this.prisma.kycDocument.findMany({
        where: { status: 'PENDING' },
        orderBy: { created_at: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.kycDocument.count({ where: { status: 'PENDING' } }),
    ]);

    return { documents: docs, total, page, total_pages: Math.ceil(total / limit) };
  }
}
