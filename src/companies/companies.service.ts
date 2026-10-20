import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';

const FLOW = ['pendente', 'em_analise', 'verificada', 'ativa'] as const;
const LABEL: Record<(typeof FLOW)[number], string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  verificada: 'Verificada',
  ativa: 'Ativa',
};

function toDto(c: { userId: string; name: string; sector: string; website: string; status: string }) {
  return { id: c.userId, name: c.name, sector: c.sector, website: c.website, status: c.status };
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.company.findMany({
      where: user.role === 'admin' ? {} : { userId: user.id },
      orderBy: { name: 'asc' },
    });
    return rows.map(toDto);
  }

  async advance(id: string, actorId: string) {
    const c = await this.prisma.company.findUnique({ where: { userId: id } });
    if (!c) throw new NotFoundException('Empresa não encontrada.');
    const i = FLOW.indexOf(c.status);
    const next = FLOW[i + 1];
    if (i < 0 || !next) throw new BadRequestException('A empresa já está no último estado.');

    const updated = await this.prisma.company.update({ where: { userId: id }, data: { status: next } });
    await this.audit.logBy(actorId, `Empresa: ${LABEL[next]}`, c.name);
    await this.notifications.notify(
      id,
      'Verificação da empresa',
      `O estado da tua empresa passou a: ${LABEL[next]}.`,
      '/app/empresa/perfil',
    );
    return toDto(updated);
  }
}
