import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type NotificationKind = 'info' | 'success' | 'warning' | 'error';

const TYPE_TO_KIND: Record<NotificationType, NotificationKind> = {
  document_uploaded: 'info',
  document_signed: 'success',
  case_updated: 'info',
  access_granted: 'success',
  access_revoked: 'warning',
  tamper_detected: 'error',
  signature_requested: 'info',
  workflow_approved: 'success',
  workflow_rejected: 'warning',
  system_alert: 'warning',
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((n) => ({
      id: n.id,
      message: n.message,
      read: n.isRead,
      timestamp: n.createdAt.toISOString(),
      kind: TYPE_TO_KIND[n.type],
    }));
  }

  async markRead(id: string) {
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }
}
