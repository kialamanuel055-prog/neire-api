import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { UpdateCompanyProfileDto } from './dto/company-profile.dto';

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

  private profileDto(c: {
    userId: string;
    description: string;
    location: string;
    areas: string;
    contactEmail: string;
    contactPhone: string;
  }) {
    return {
      companyId: c.userId,
      description: c.description,
      location: c.location,
      areas: c.areas,
      contactEmail: c.contactEmail,
      contactPhone: c.contactPhone,
    };
  }

  async getProfile(user: AuthUser) {
    const c = await this.prisma.company.findUnique({ where: { userId: user.id } });
    if (!c) throw new NotFoundException('Empresa não encontrada.');
    return this.profileDto(c);
  }

  async updateProfile(user: AuthUser, dto: UpdateCompanyProfileDto) {
    const c = await this.prisma.company.findUnique({ where: { userId: user.id } });
    if (!c) throw new NotFoundException('Empresa não encontrada.');
    const t = (v?: string) => (v === undefined ? undefined : v.trim());
    const updated = await this.prisma.company.update({
      where: { userId: user.id },
      data: {
        description: t(dto.description),
        location: t(dto.location),
        areas: t(dto.areas),
        contactEmail: t(dto.contactEmail),
        contactPhone: t(dto.contactPhone),
      },
    });
    return this.profileDto(updated);
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
