import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(actor: string, action: string, detail: string): Promise<void> {
    await this.prisma.auditLog.create({ data: { actor, action, detail } });
  }

  async logBy(userId: string, action: string, detail: string): Promise<void> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await this.log(u?.name ?? 'sistema', action, detail);
  }

  async list() {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { at: 'desc' }, take: 200 });
    return rows.map((r) => ({
      id: r.id,
      at: r.at.toISOString(),
      actor: r.actor,
      action: r.action,
      detail: r.detail,
    }));
  }
}
