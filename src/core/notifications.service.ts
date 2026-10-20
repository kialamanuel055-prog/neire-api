import { Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(userId: string, title: string, text: string, link?: string): Promise<void> {
    await this.prisma.notification.create({ data: { userId, title, text, link: link ?? null } });
  }

  async notifyMany(userIds: string[], title: string, text: string, link?: string): Promise<void> {
    if (userIds.length === 0) return;
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, title, text, link: link ?? null })),
    });
  }

  async notifyRoles(roles: Role[], title: string, text: string, link?: string): Promise<void> {
    const users = await this.prisma.user.findMany({ where: { role: { in: roles } }, select: { id: true } });
    await this.notifyMany(
      users.map((u) => u.id),
      title,
      text,
      link,
    );
  }

  async listFor(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { at: 'desc' },
      take: 100,
    });
    return rows.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      text: n.text,
      link: n.link ?? undefined,
      read: n.read,
      at: n.at.toISOString(),
    }));
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { ok: true };
  }
}
