import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { CreateComplaintDto, SetComplaintStatusDto } from './dto/complaint.dto';

const LABEL: Record<string, string> = {
  recebida: 'Recebida',
  em_analise: 'Em análise',
  resolvida: 'Resolvida',
};

interface Row {
  id: string;
  category: string;
  description: string;
  authorId: string | null;
  status: string;
  response: string | null;
  createdAt: Date;
  author: { name: string } | null;
}

function toDto(c: Row) {
  return {
    id: c.id,
    category: c.category,
    description: c.description,
    authorId: c.authorId ?? undefined,
    authorName: c.author?.name,
    status: c.status,
    response: c.response ?? undefined,
    createdAt: c.createdAt.toISOString(),
  };
}

const INCLUDE = { author: { select: { name: true } } } as const;

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.complaint.findMany({
      where: user.role === 'admin' ? {} : { authorId: user.id },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return rows.map(toDto);
  }

  // Denuncia anonima: o servidor nao guarda quem enviou e nao regista nada na auditoria.
  async create(user: AuthUser, dto: CreateComplaintDto) {
    const created = await this.prisma.complaint.create({
      data: {
        category: dto.category.trim(),
        description: dto.description.trim(),
        authorId: dto.anonymous ? null : user.id,
      },
      include: INCLUDE,
    });
    await this.notifications.notifyRoles(['admin'], 'Nova denúncia recebida', created.category, '/app/admin/denuncias');
    return toDto(created);
  }

  async setStatus(admin: AuthUser, id: string, dto: SetComplaintStatusDto) {
    const c = await this.prisma.complaint.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Denúncia não encontrada.');
    const response = dto.response?.trim();
    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { status: dto.status, ...(response ? { response } : {}) },
      include: INCLUDE,
    });
    await this.audit.logBy(admin.id, `Denúncia: ${LABEL[dto.status]}`, updated.category);
    if (updated.authorId) {
      await this.notifications.notify(
        updated.authorId,
        'Denúncia atualizada',
        `A tua denúncia está agora: ${LABEL[dto.status]}.`,
        '/app/denuncias',
      );
    }
    return toDto(updated);
  }
}
