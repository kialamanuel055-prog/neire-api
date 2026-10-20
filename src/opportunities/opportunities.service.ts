import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { OpportunityStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';

const LABEL: Record<OpportunityStatus, string> = {
  pendente: 'Pendente de validação',
  publicada: 'Publicada',
  encerrada: 'Encerrada',
  rejeitada: 'Rejeitada',
};

interface Row {
  id: string;
  title: string;
  companyId: string;
  type: string;
  area: string;
  modality: string;
  level: string;
  description: string;
  requirements: string[];
  vacancies: number;
  deadline: Date;
  status: string;
  createdAt: Date;
  company: { name: string };
}

function toDto(o: Row) {
  return {
    id: o.id,
    title: o.title,
    companyId: o.companyId,
    companyName: o.company.name,
    type: o.type,
    area: o.area,
    modality: o.modality,
    level: o.level,
    description: o.description,
    requirements: o.requirements,
    vacancies: o.vacancies,
    deadline: o.deadline.toISOString().slice(0, 10),
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  };
}

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    const where =
      user.role === 'admin'
        ? {}
        : user.role === 'company'
          ? { companyId: user.id }
          : { status: 'publicada' as const };
    const rows = await this.prisma.opportunity.findMany({
      where,
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async create(user: AuthUser, dto: CreateOpportunityDto) {
    const company = await this.prisma.company.findUnique({ where: { userId: user.id } });
    if (!company) throw new ForbiddenException('Só empresas podem publicar oportunidades.');
    if (company.status !== 'verificada' && company.status !== 'ativa') {
      throw new ForbiddenException('A tua empresa ainda não foi verificada pelo NEIRE.');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (dto.deadline < today) throw new BadRequestException('Indica um prazo futuro.');

    const created = await this.prisma.opportunity.create({
      data: {
        companyId: user.id,
        title: dto.title.trim(),
        type: dto.type,
        area: dto.area,
        modality: dto.modality,
        level: dto.level,
        description: dto.description.trim(),
        requirements: dto.requirements.map((r) => r.trim()).filter(Boolean),
        vacancies: dto.vacancies,
        deadline: new Date(dto.deadline),
      },
      include: { company: { select: { name: true } } },
    });

    await this.audit.logBy(user.id, 'Oportunidade submetida', `${created.title} (${created.company.name})`);
    await this.notifications.notifyRoles(
      ['admin'],
      'Nova oportunidade para validar',
      `${created.title} (${created.company.name})`,
      '/app/admin/oportunidades',
    );
    return toDto(created);
  }

  async setStatus(user: AuthUser, id: string, status: OpportunityStatus) {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id },
      include: { company: { select: { name: true } } },
    });
    if (!opp) throw new NotFoundException('Oportunidade não encontrada.');

    if (user.role === 'company') {
      if (opp.companyId !== user.id) throw new ForbiddenException('Esta oportunidade não é da tua empresa.');
      if (status !== 'encerrada') {
        throw new ForbiddenException('As empresas só podem encerrar as suas oportunidades.');
      }
    }
    if (opp.status === status) return toDto(opp);

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: { status },
      include: { company: { select: { name: true } } },
    });
    await this.audit.logBy(user.id, `Oportunidade: ${LABEL[status]}`, opp.title);

    if (status === 'publicada') {
      await this.notifications.notify(
        opp.companyId,
        'Oportunidade publicada',
        `"${opp.title}" foi aprovada e já está visível aos estudantes.`,
        '/app/empresa/oportunidades',
      );
      await this.notifications.notifyRoles(
        ['student', 'alumni'],
        'Nova oportunidade',
        `${opp.title} · ${opp.company.name}`,
        `/app/estudante/oportunidades/${opp.id}`,
      );
    } else if (status === 'rejeitada') {
      await this.notifications.notify(
        opp.companyId,
        'Oportunidade rejeitada',
        `"${opp.title}" não foi aprovada pelo NEIRE.`,
        '/app/empresa/oportunidades',
      );
    }
    return toDto(updated);
  }
}
