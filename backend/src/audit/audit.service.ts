import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { dbRoleNameToCode } from '../auth/auth.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // `target` matches the frontend's AuditFilters — filters by resource_id.
  async findAll(target?: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: target ? { resourceId: target } : {},
      include: { user: { include: { role: true } } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    return rows.map((r) => ({
      id: r.id,
      actor: r.user?.name ?? 'System',
      role: r.user ? dbRoleNameToCode(r.user.role.name) : 'AUDITOR',
      action: r.action,
      target: r.resourceId ?? r.resourceType ?? '',
      timestamp: r.timestamp.toISOString(),
    }));
  }
}
