import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    companyId: string,
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        companyId,
        userId,
        action,
        entity,
        entityId,
        oldData,
        newData,
        ipAddress,
      },
    });
  }

  async listCompanyLogs(companyId: string, entity?: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: {
        companyId,
        ...(entity ? { entity } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
