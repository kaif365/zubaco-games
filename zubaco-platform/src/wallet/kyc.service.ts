import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { KycDocType } from '.prisma/client';

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SUBMIT KYC DOCUMENT ───────────────────────────────────────

  async submitDocument(userId: string, docType: KycDocType, documentUrl: string, documentNumber?: string) {
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

    return this.prisma.kycDocument.create({
      data: {
        user_id: userId,
        document_type: docType,
        document_number: documentNumber,
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
      documents: documents.map((d) => ({
        id: d.id,
        type: d.document_type,
        status: d.status,
        rejection_reason: d.rejection_reason,
        submitted_at: d.created_at,
      })),
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
