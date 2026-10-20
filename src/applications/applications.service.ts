import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { ApplyDto } from './dto/application.dto';

const LABEL: Record<ApplicationStatus, string> = {
  enviada: 'Candidatura enviada',
  em_analise: 'Em análise',
  pre_selecionado: 'Pré-selecionado',
  entrevista: 'Entrevista',
  selecionado: 'Selecionado',
  nao_selecionado: 'Não selecionado',
};

const INCLUDE = {
  history: { orderBy: { at: 'asc' } },
  student: { select: { name: true } },
} as const;

interface Row {
  id: string;
  opportunityId: string;
  studentId: string;
  message: string;
  status: string;
  createdAt: Date;
  student: { name: string };
  history: { status: string; at: Date }[];
}

function toDto(a: Row) {
  return {
    id: a.id,
    opportunityId: a.opportunityId,
    studentId: a.studentId,
    studentName: a.student.name,
    status: a.status,
    message: a.message,
    createdAt: a.createdAt.toISOString(),
    history: a.history.map((h) => ({ status: h.status, at: h.at.toISOString() })),
  };
}

@Injectable()
export class ApplicationsService {
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
          ? { opportunity: { companyId: user.id } }
          : { studentId: user.id };
    const rows = await this.prisma.application.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async apply(user: AuthUser, dto: ApplyDto) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: dto.opportunityId } });
    if (!opp || opp.status !== 'publicada') throw new NotFoundException('Oportunidade indisponível.');

    const today = new Date().toISOString().slice(0, 10);
    if (opp.deadline.toISOString().slice(0, 10) < today) {
      throw new BadRequestException('O prazo desta oportunidade terminou.');
    }
    const dup = await this.prisma.application.findUnique({
      where: { opportunityId_studentId: { opportunityId: opp.id, studentId: user.id } },
    });
    if (dup) throw new ConflictException('Já te candidataste a esta oportunidade.');

    const created = await this.prisma.application.create({
      data: {
        opportunityId: opp.id,
        studentId: user.id,
        message: dto.message?.trim() ?? '',
        history: { create: [{ status: 'enviada' }] },
      },
      include: INCLUDE,
    });
    await this.notifications.notify(
      opp.companyId,
      'Nova candidatura',
      `${created.student.name} candidatou-se a ${opp.title}`,
      '/app/empresa/candidaturas',
    );
    return toDto(created);
  }

  async setStatus(user: AuthUser, id: string, status: ApplicationStatus) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { opportunity: { select: { title: true, companyId: true } } },
    });
    if (!app) throw new NotFoundException('Candidatura não encontrada.');
    if (user.role === 'company' && app.opportunity.companyId !== user.id) {
      throw new ForbiddenException('Esta candidatura não é de uma oportunidade da tua empresa.');
    }

    if (app.status === status) {
      const same = await this.prisma.application.findUniqueOrThrow({ where: { id }, include: INCLUDE });
      return toDto(same);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status, history: { create: [{ status }] } },
      include: INCLUDE,
    });
    await this.audit.logBy(user.id, 'Estado de candidatura alterado', `${updated.student.name} → ${LABEL[status]}`);
    await this.notifications.notify(
      app.studentId,
      'Candidatura atualizada',
      `${app.opportunity.title}: ${LABEL[status]}`,
      '/app/estudante/candidaturas',
    );
    return toDto(updated);
  }
}
