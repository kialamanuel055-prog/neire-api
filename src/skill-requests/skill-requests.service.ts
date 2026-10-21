import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { CreateSkillRequestDto, DecideSkillRequestDto } from './dto/skill-request.dto';

const LEVEL_LABEL: Record<string, string> = {
  declarada: 'Declarada',
  comprovada: 'Comprovada',
  validada: 'Validada',
};

interface Row {
  id: string;
  userId: string;
  skill: string;
  evidenceType: string;
  evidence: string;
  status: string;
  resultLevel: string | null;
  at: Date;
  decidedAt: Date | null;
  user: { name: string };
}

function toDto(r: Row) {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    skill: r.skill,
    evidenceType: r.evidenceType,
    evidence: r.evidence,
    status: r.status,
    resultLevel: r.resultLevel ?? undefined,
    at: r.at.toISOString(),
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : undefined,
  };
}

const INCLUDE = { user: { select: { name: true } } } as const;

@Injectable()
export class SkillRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.skillRequest.findMany({
      where: user.role === 'admin' ? {} : { userId: user.id },
      include: INCLUDE,
      orderBy: { at: 'desc' },
    });
    return rows.map(toDto);
  }

  async create(user: AuthUser, dto: CreateSkillRequestDto) {
    const skill = await this.prisma.skill.findFirst({
      where: { profileId: user.id, name: dto.skill },
    });
    if (!skill) throw new BadRequestException('Essa competência não está no teu perfil.');
    if (skill.level === 'validada') throw new BadRequestException('Esta competência já está validada.');

    const pending = await this.prisma.skillRequest.findFirst({
      where: { userId: user.id, skill: dto.skill, status: 'pendente' },
    });
    if (pending) throw new ConflictException('Já tens um pedido pendente para esta competência.');

    const created = await this.prisma.skillRequest.create({
      data: {
        userId: user.id,
        skill: dto.skill,
        evidenceType: dto.evidenceType.trim(),
        evidence: dto.evidence.trim(),
      },
      include: INCLUDE,
    });
    await this.notifications.notifyRoles(
      ['admin'],
      'Novo pedido de verificação',
      `${created.user.name}: ${created.skill}`,
      '/app/admin/competencias',
    );
    return toDto(created);
  }

  async decide(user: AuthUser, id: string, dto: DecideSkillRequestDto) {
    const r = await this.prisma.skillRequest.findUnique({ where: { id }, include: INCLUDE });
    if (!r) throw new NotFoundException('Pedido não encontrado.');
    if (r.status !== 'pendente') throw new BadRequestException('Este pedido já foi decidido.');

    const level = dto.level ?? 'comprovada';
    if (dto.approved && level === 'declarada') {
      throw new BadRequestException('Escolhe o nível Comprovada ou Validada.');
    }
    const now = new Date();

    if (dto.approved) {
      await this.prisma.$transaction([
        this.prisma.skill.updateMany({ where: { profileId: r.userId, name: r.skill }, data: { level } }),
        this.prisma.skillRequest.update({
          where: { id },
          data: { status: 'aprovada', resultLevel: level, decidedAt: now },
        }),
      ]);
      await this.audit.logBy(user.id, 'Competência verificada', `${r.user.name}: ${r.skill}`);
      await this.notifications.notify(
        r.userId,
        'Competência verificada',
        `${r.skill}: ${LEVEL_LABEL[level]}`,
        '/app/estudante/competencias',
      );
    } else {
      await this.prisma.skillRequest.update({
        where: { id },
        data: { status: 'rejeitada', decidedAt: now },
      });
      await this.audit.logBy(user.id, 'Verificação rejeitada', `${r.user.name}: ${r.skill}`);
      await this.notifications.notify(
        r.userId,
        'Pedido de verificação rejeitado',
        `${r.skill}: o NEIRE não conseguiu confirmar a evidência.`,
        '/app/estudante/competencias',
      );
    }

    const fresh = await this.prisma.skillRequest.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return toDto(fresh);
  }
}
