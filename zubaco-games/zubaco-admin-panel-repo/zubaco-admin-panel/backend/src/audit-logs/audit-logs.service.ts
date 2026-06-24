import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

interface GetLogsOptions {
  page: number;
  limit: number;
  adminId?: string;
  entity?: string;
  action?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(options: GetLogsOptions) {
    const { page, limit, adminId, entity, action } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (adminId) where.admin_id = adminId;
    if (entity) where.entity = entity;
    if (action) where.action = { contains: action };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          admin: { select: { id: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }
}
