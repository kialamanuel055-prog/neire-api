import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import { CertificatesService } from '../certificates/certificates.service';
import { isUniqueViolation } from '../common/link';
import type { AuthUser } from '../common/types';
import { CreateContestDto, CreateDebateTeamDto, ResultDto } from './dto/debate.dto';

const MAX_TEAM = 3;

interface ContestRow {
  id: string;
  title: string;
  description: string;
  topics: string[];
  status: string;
  createdAt: Date;
}

interface TeamRow {
  id: string;
  contestId: string;
  name: string;
  members: { userId: string; user: { name: string } }[];
}

interface MatchRow {
  id: string;
  contestId: string;
  round: number;
  teamAId: string;
  teamBId: string;
  topic: string;
  scoreA: number | null;
  scoreB: number | null;
}

function contestDto(c: ContestRow) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    topics: c.topics,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  };
}

function teamDto(t: TeamRow) {
  return {
    id: t.id,
    contestId: t.contestId,
    name: t.name,
    members: t.members.map((m) => ({ id: m.userId, name: m.user.name })),
  };
}

function matchDto(m: MatchRow) {
  return {
    id: m.id,
    contestId: m.contestId,
    round: m.round,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    topic: m.topic,
    scoreA: m.scoreA ?? undefined,
    scoreB: m.scoreB ?? undefined,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

const TEAM_INC = { members: { include: { user: { select: { name: true } } } } } as const;

@Injectable()
export class DebatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly certificates: CertificatesService,
  ) {}

  private async load(id: string): Promise<ContestRow> {
    const c = await this.prisma.debateContest.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Concurso não encontrado.');
    return c;
  }

  // ---------- concursos ----------
  async listContests() {
    const rows = await this.prisma.debateContest.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map(contestDto);
  }

  async createContest(admin: AuthUser, dto: CreateContestDto) {
    const created = await this.prisma.debateContest.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        topics: dto.topics.map((t) => t.trim()).filter(Boolean),
      },
    });
    await this.audit.logBy(admin.id, 'Concurso de debates criado', created.title);
    return contestDto(created);
  }

  // Sorteia uma ronda. Com numero impar de equipas, uma fica sem confronto nessa ronda.
  private async drawRound(actorId: string, contest: ContestRow): Promise<number> {
    const existing = await this.prisma.debateMatch.findMany({ where: { contestId: contest.id } });
    if (existing.some((m) => m.scoreA === null || m.scoreB === null)) {
      throw new BadRequestException('Há confrontos sem resultado. Regista-os antes de sortear a próxima ronda.');
    }
    const round = existing.reduce((n, m) => Math.max(n, m.round), 0) + 1;
    const teams = shuffle(
      await this.prisma.debateTeam.findMany({ where: { contestId: contest.id }, include: { members: true } }),
    );

    const data: { contestId: string; round: number; teamAId: string; teamBId: string; topic: string }[] = [];
    const notices: { userId: string; text: string }[] = [];
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const a = teams[i];
      const b = teams[i + 1];
      if (!a || !b) break;
      const topic = contest.topics.length
        ? (contest.topics[randomInt(contest.topics.length)] ?? 'Tema livre')
        : 'Tema livre';
      data.push({ contestId: contest.id, round, teamAId: a.id, teamBId: b.id, topic });
      for (const m of [...a.members, ...b.members]) {
        notices.push({ userId: m.userId, text: `Ronda ${round}: ${a.name} vs ${b.name}` });
      }
    }
    if (data.length === 0) return 0;

    await this.prisma.debateMatch.createMany({ data });
    await this.audit.logBy(actorId, 'Ronda de debates sorteada', `${contest.title} · ronda ${round}`);
    for (const n of notices) {
      await this.notifications.notify(n.userId, 'Debate sorteado', n.text, '/app/estudante/debates');
    }
    return data.length;
  }

  async start(admin: AuthUser, id: string) {
    const c = await this.load(id);
    if (c.status !== 'inscricoes') throw new BadRequestException('O concurso já foi iniciado.');
    const n = await this.prisma.debateTeam.count({ where: { contestId: id } });
    if (n < 2) throw new BadRequestException('São precisas pelo menos 2 equipas.');
    const updated = await this.prisma.debateContest.update({ where: { id }, data: { status: 'em_curso' } });
    await this.audit.logBy(admin.id, 'Concurso de debates iniciado', updated.title);
    const drawn = await this.drawRound(admin.id, updated);
    return { ...contestDto(updated), drawn };
  }

  async draw(admin: AuthUser, id: string) {
    const c = await this.load(id);
    if (c.status !== 'em_curso') throw new BadRequestException('O concurso não está em curso.');
    return { drawn: await this.drawRound(admin.id, c) };
  }

  async finish(admin: AuthUser, id: string) {
    const c = await this.load(id);
    if (c.status !== 'em_curso') throw new BadRequestException('O concurso não está em curso.');
    const updated = await this.prisma.debateContest.update({ where: { id }, data: { status: 'terminado' } });
    await this.audit.logBy(admin.id, 'Concurso de debates terminado', updated.title);
    const teams = await this.prisma.debateTeam.findMany({ where: { contestId: id }, include: { members: true } });
    const matches = await this.prisma.debateMatch.findMany({ where: { contestId: id } });
    const table = new Map<string, { members: { userId: string }[]; played: number; points: number; scored: number }>();
    for (const t of teams) table.set(t.id, { members: t.members, played: 0, points: 0, scored: 0 });
    for (const m of matches) {
      if (m.scoreA === null || m.scoreB === null) continue;
      const a = table.get(m.teamAId);
      const b = table.get(m.teamBId);
      if (!a || !b) continue;
      a.played++;
      b.played++;
      a.scored += m.scoreA;
      b.scored += m.scoreB;
      if (m.scoreA > m.scoreB) a.points += 3;
      else if (m.scoreA < m.scoreB) b.points += 3;
      else {
        a.points += 1;
        b.points += 1;
      }
    }
    const rank = [...table.values()].sort((x, y) => y.points - x.points || y.scored - x.scored);
    for (let i = 0; i < rank.length; i++) {
      const row = rank[i]!;
      const label = i === 0 && row.played > 0 ? '1.º lugar' : 'participação';
      for (const m of row.members) {
        await this.certificates.issueFor(m.userId, `Concurso de Debates: ${updated.title} (${label})`, admin.id);
      }
    }
    const members = await this.prisma.debateTeamMember.findMany({ where: { contestId: id } });
    for (const m of members) {
      await this.notifications.notify(
        m.userId,
        'Concurso terminado',
        `"${updated.title}" terminou. Consulta a classificação final.`,
        '/app/estudante/debates',
      );
    }
    return contestDto(updated);
  }

  // ---------- equipas ----------
  async listTeams() {
    const rows = await this.prisma.debateTeam.findMany({
      include: TEAM_INC,
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });
    return rows.map(teamDto);
  }

  async createTeam(user: AuthUser, dto: CreateDebateTeamDto) {
    const c = await this.load(dto.contestId);
    if (c.status !== 'inscricoes') throw new BadRequestException('As inscrições deste concurso já fecharam.');
    try {
      const t = await this.prisma.debateTeam.create({
        data: {
          contestId: c.id,
          name: dto.name.trim(),
          members: { create: { contestId: c.id, userId: user.id } },
        },
        include: TEAM_INC,
      });
      return teamDto(t);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Já estás numa equipa deste concurso.');
      throw e;
    }
  }

  async joinTeam(user: AuthUser, teamId: string) {
    const team = await this.prisma.debateTeam.findUnique({
      where: { id: teamId },
      include: { members: true, contest: true },
    });
    if (!team) throw new NotFoundException('Equipa não encontrada.');
    if (team.contest.status !== 'inscricoes') throw new BadRequestException('As inscrições deste concurso já fecharam.');
    if (team.members.length >= MAX_TEAM) throw new BadRequestException('A equipa está cheia.');
    try {
      await this.prisma.debateTeamMember.create({
        data: { teamId, contestId: team.contestId, userId: user.id },
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Já estás numa equipa deste concurso.');
      throw e;
    }
    const fresh = await this.prisma.debateTeam.findUnique({ where: { id: teamId }, include: TEAM_INC });
    return teamDto(fresh!);
  }

  async leaveTeam(user: AuthUser, teamId: string) {
    const team = await this.prisma.debateTeam.findUnique({
      where: { id: teamId },
      include: { members: true, contest: true },
    });
    if (!team) throw new NotFoundException('Equipa não encontrada.');
    if (team.contest.status !== 'inscricoes') throw new BadRequestException('As inscrições deste concurso já fecharam.');
    if (!team.members.some((m) => m.userId === user.id)) throw new NotFoundException('Não pertences a esta equipa.');
    await this.prisma.debateTeamMember.deleteMany({ where: { teamId, userId: user.id } });
    if (team.members.length === 1) await this.prisma.debateTeam.deleteMany({ where: { id: teamId } });
    return { ok: true };
  }

  // ---------- confrontos ----------
  async listMatches() {
    const rows = await this.prisma.debateMatch.findMany({
      orderBy: [{ round: 'asc' }, { id: 'asc' }],
      take: 5000,
    });
    return rows.map(matchDto);
  }

  async setResult(admin: AuthUser, id: string, dto: ResultDto) {
    const m = await this.prisma.debateMatch.findUnique({
      where: { id },
      include: { contest: true, teamA: true, teamB: true },
    });
    if (!m) throw new NotFoundException('Confronto não encontrado.');
    if (m.contest.status !== 'em_curso') throw new BadRequestException('O concurso não está em curso.');
    const updated = await this.prisma.debateMatch.update({
      where: { id },
      data: { scoreA: dto.scoreA, scoreB: dto.scoreB },
    });
    await this.audit.logBy(
      admin.id,
      'Resultado de debate registado',
      `${m.teamA.name} ${dto.scoreA} - ${dto.scoreB} ${m.teamB.name}`,
    );
    return matchDto(updated);
  }
}
