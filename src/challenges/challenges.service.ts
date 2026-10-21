import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import { isUniqueViolation, normalizeLink } from '../common/link';
import type { AuthUser } from '../common/types';
import {
  CreateChallengeDto,
  CreateChallengeTeamDto,
  ScoreDto,
  SetChallengeStatusDto,
  SubmitSolutionDto,
} from './dto/challenge.dto';

const MAX_TEAM = 4;

interface ChallengeRow {
  id: string;
  companyId: string;
  title: string;
  problem: string;
  requirements: string[];
  skills: string[];
  deadline: Date;
  prize: string;
  status: string;
  winnerTeamId: string | null;
  createdAt: Date;
}

interface TeamRow {
  id: string;
  challengeId: string;
  name: string;
  members: { userId: string; user: { name: string } }[];
}

interface SubRow {
  id: string;
  challengeId: string;
  teamId: string;
  summary: string;
  link: string;
  score: number | null;
  feedback: string | null;
  submittedAt: Date;
  team: { name: string };
}

function challengeDto(c: ChallengeRow, companyName: string) {
  return {
    id: c.id,
    title: c.title,
    companyId: c.companyId,
    companyName,
    problem: c.problem,
    requirements: c.requirements,
    skills: c.skills,
    deadline: c.deadline.toISOString().slice(0, 10),
    prize: c.prize,
    status: c.status,
    winnerTeamId: c.winnerTeamId ?? undefined,
    createdAt: c.createdAt.toISOString(),
  };
}

function teamDto(t: TeamRow) {
  return {
    id: t.id,
    challengeId: t.challengeId,
    name: t.name,
    members: t.members.map((m) => ({ id: m.userId, name: m.user.name })),
  };
}

function subDto(s: SubRow) {
  return {
    id: s.id,
    challengeId: s.challengeId,
    teamId: s.teamId,
    teamName: s.team.name,
    summary: s.summary,
    link: s.link,
    score: s.score ?? undefined,
    feedback: s.feedback ?? undefined,
    submittedAt: s.submittedAt.toISOString(),
  };
}

function parseDeadline(raw: string): Date {
  const d = raw.length === 10 ? new Date(`${raw}T23:59:59.000Z`) : new Date(raw);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Prazo inválido.');
  return d;
}

const TEAM_INC = { members: { include: { user: { select: { name: true } } } } } as const;
const SUB_INC = { team: { select: { name: true } } } as const;

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private visible(user: AuthUser): Prisma.ChallengeWhereInput {
    if (user.role === 'admin') return {};
    if (user.role === 'company') return { companyId: user.id };
    return { status: { in: ['ativo', 'encerrado'] } };
  }

  private async names(ids: string[]): Promise<Map<string, string>> {
    const rows = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, name: true },
    });
    return new Map<string, string>(rows.map((r) => [r.id, r.name] as [string, string]));
  }

  private async load(id: string): Promise<ChallengeRow> {
    const ch = await this.prisma.challenge.findUnique({ where: { id } });
    if (!ch) throw new NotFoundException('Desafio não encontrado.');
    return ch;
  }

  private assertOpen(ch: ChallengeRow) {
    if (ch.status !== 'ativo' || ch.deadline.getTime() < Date.now()) {
      throw new BadRequestException('Este desafio já não aceita participações.');
    }
  }

  private async companyName(id: string): Promise<string> {
    return (await this.names([id])).get(id) ?? '';
  }

  // ---------- desafios ----------
  async list(user: AuthUser) {
    const rows = await this.prisma.challenge.findMany({
      where: this.visible(user),
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const names = await this.names(rows.map((r) => r.companyId));
    return rows.map((r) => challengeDto(r, names.get(r.companyId) ?? ''));
  }

  async create(user: AuthUser, dto: CreateChallengeDto) {
    const deadline = parseDeadline(dto.deadline);
    if (deadline.getTime() < Date.now()) throw new BadRequestException('Indica um prazo futuro.');
    const created = await this.prisma.challenge.create({
      data: {
        companyId: user.id,
        title: dto.title.trim(),
        problem: dto.problem.trim(),
        requirements: dto.requirements.map((s) => s.trim()).filter(Boolean),
        skills: dto.skills.map((s) => s.trim()).filter(Boolean),
        deadline,
        prize: dto.prize?.trim() ?? '',
      },
    });
    const name = await this.companyName(user.id);
    await this.audit.logBy(user.id, 'Desafio submetido', `${created.title} (${name})`);
    await this.notifications.notifyRoles(
      ['admin'],
      'Novo desafio para validar',
      `${name}: ${created.title}`,
      '/app/admin/desafios',
    );
    return challengeDto(created, name);
  }

  async setStatus(admin: AuthUser, id: string, dto: SetChallengeStatusDto) {
    const ch = await this.load(id);
    if (ch.status !== 'pendente') throw new BadRequestException('Só desafios pendentes podem ser validados.');
    const updated = await this.prisma.challenge.update({ where: { id }, data: { status: dto.status } });
    const name = await this.companyName(ch.companyId);
    await this.audit.logBy(admin.id, dto.status === 'ativo' ? 'Desafio publicado' : 'Desafio rejeitado', ch.title);
    if (dto.status === 'ativo') {
      await this.notifications.notify(
        ch.companyId,
        'Desafio aprovado',
        `"${ch.title}" já está visível aos estudantes.`,
        '/app/empresa/desafios',
      );
      await this.notifications.notifyRoles(
        ['student', 'alumni'],
        'Novo desafio empresarial',
        `${ch.title} · ${name}`,
        `/app/estudante/desafios/${ch.id}`,
      );
    } else {
      await this.notifications.notify(
        ch.companyId,
        'Desafio rejeitado',
        `"${ch.title}" não foi aprovado pelo NEIRE.`,
        '/app/empresa/desafios',
      );
    }
    return challengeDto(updated, name);
  }

  async declareWinner(user: AuthUser, id: string) {
    const ch = await this.load(id);
    if (user.role !== 'admin' && ch.companyId !== user.id) {
      throw new ForbiddenException('Só a empresa do desafio pode declarar o vencedor.');
    }
    if (ch.status !== 'ativo') throw new BadRequestException('Este desafio não está ativo.');

    const best = await this.prisma.challengeSubmission.findFirst({
      where: { challengeId: id, score: { not: null } },
      orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
      include: { team: { include: { members: true } } },
    });
    if (!best) throw new BadRequestException('Avalia pelo menos uma submissão antes de declarar o vencedor.');

    const updated = await this.prisma.challenge.update({
      where: { id },
      data: { status: 'encerrado', winnerTeamId: best.teamId },
    });
    await this.audit.logBy(user.id, 'Vencedor de desafio declarado', `${ch.title} → ${best.team.name}`);
    for (const m of best.team.members) {
      await this.notifications.notify(
        m.userId,
        'Ganhaste o desafio!',
        `${best.team.name} venceu "${ch.title}".`,
        `/app/estudante/desafios/${ch.id}`,
      );
    }
    return challengeDto(updated, await this.companyName(ch.companyId));
  }

  // ---------- equipas ----------
  async listTeams(user: AuthUser) {
    const rows = await this.prisma.challengeTeam.findMany({
      where: { challenge: this.visible(user) },
      include: TEAM_INC,
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    return rows.map(teamDto);
  }

  async createTeam(user: AuthUser, dto: CreateChallengeTeamDto) {
    const ch = await this.load(dto.challengeId);
    this.assertOpen(ch);
    try {
      const t = await this.prisma.challengeTeam.create({
        data: {
          challengeId: ch.id,
          name: dto.name.trim(),
          members: { create: { challengeId: ch.id, userId: user.id } },
        },
        include: TEAM_INC,
      });
      return teamDto(t);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Já estás numa equipa deste desafio.');
      throw e;
    }
  }

  async joinTeam(user: AuthUser, teamId: string) {
    const team = await this.prisma.challengeTeam.findUnique({
      where: { id: teamId },
      include: { members: true, challenge: true },
    });
    if (!team) throw new NotFoundException('Equipa não encontrada.');
    this.assertOpen(team.challenge);
    if (team.members.length >= MAX_TEAM) throw new BadRequestException('A equipa está cheia.');
    try {
      await this.prisma.challengeTeamMember.create({
        data: { teamId, challengeId: team.challengeId, userId: user.id },
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Já estás numa equipa deste desafio.');
      throw e;
    }
    const fresh = await this.prisma.challengeTeam.findUnique({ where: { id: teamId }, include: TEAM_INC });
    return teamDto(fresh!);
  }

  async leaveTeam(user: AuthUser, teamId: string) {
    const team = await this.prisma.challengeTeam.findUnique({
      where: { id: teamId },
      include: { members: true, challenge: true },
    });
    if (!team) throw new NotFoundException('Equipa não encontrada.');
    if (team.challenge.status === 'encerrado') throw new BadRequestException('O desafio já terminou.');
    if (!team.members.some((m) => m.userId === user.id)) throw new NotFoundException('Não pertences a esta equipa.');
    await this.prisma.challengeTeamMember.deleteMany({ where: { teamId, userId: user.id } });
    if (team.members.length === 1) await this.prisma.challengeTeam.deleteMany({ where: { id: teamId } });
    return { ok: true };
  }

  // ---------- submissoes ----------
  async listSubmissions(user: AuthUser) {
    const where: Prisma.ChallengeSubmissionWhereInput =
      user.role === 'admin'
        ? {}
        : user.role === 'company'
          ? { challenge: { companyId: user.id } }
          : { team: { members: { some: { userId: user.id } } } };
    const rows = await this.prisma.challengeSubmission.findMany({
      where,
      include: SUB_INC,
      orderBy: { submittedAt: 'desc' },
      take: 2000,
    });
    return rows.map(subDto);
  }

  async submit(user: AuthUser, teamId: string, dto: SubmitSolutionDto) {
    const team = await this.prisma.challengeTeam.findUnique({
      where: { id: teamId },
      include: { members: true, challenge: true },
    });
    if (!team) throw new NotFoundException('Equipa não encontrada.');
    if (!team.members.some((m) => m.userId === user.id)) {
      throw new ForbiddenException('Só os membros da equipa podem submeter.');
    }
    this.assertOpen(team.challenge);

    const summary = dto.summary.trim();
    const link = normalizeLink(dto.link);
    const saved = await this.prisma.challengeSubmission.upsert({
      where: { teamId },
      update: { summary, link, submittedAt: new Date(), score: null, feedback: null },
      create: { challengeId: team.challengeId, teamId, summary, link },
      include: SUB_INC,
    });
    await this.notifications.notify(
      team.challenge.companyId,
      'Nova submissão',
      `A equipa ${team.name} submeteu uma solução para "${team.challenge.title}".`,
      '/app/empresa/desafios',
    );
    return subDto(saved);
  }

  async score(user: AuthUser, id: string, dto: ScoreDto) {
    const sub = await this.prisma.challengeSubmission.findUnique({
      where: { id },
      include: { challenge: true, team: { include: { members: true } } },
    });
    if (!sub) throw new NotFoundException('Submissão não encontrada.');
    if (user.role !== 'admin' && sub.challenge.companyId !== user.id) {
      throw new ForbiddenException('Só a empresa do desafio pode avaliar.');
    }
    if (sub.challenge.status === 'encerrado') throw new BadRequestException('O desafio já terminou.');

    const value = Math.round(dto.score * 10) / 10;
    const updated = await this.prisma.challengeSubmission.update({
      where: { id },
      data: { score: value, feedback: dto.feedback?.trim() ?? '' },
      include: SUB_INC,
    });
    await this.audit.logBy(user.id, 'Submissão avaliada', `${sub.team.name}: ${value}/10`);
    for (const m of sub.team.members) {
      await this.notifications.notify(
        m.userId,
        'Submissão avaliada',
        `${sub.team.name} recebeu ${value}/10.`,
        `/app/estudante/desafios/${sub.challengeId}`,
      );
    }
    return subDto(updated);
  }
}
