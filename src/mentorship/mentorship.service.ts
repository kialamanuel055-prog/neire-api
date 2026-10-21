import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { BecomeMentorDto, CreateRequestDto } from './dto/mentorship.dto';

interface MentorRow {
  userId: string;
  area: string;
  company: string;
  bio: string;
  active: boolean;
  user: { name: string };
}

interface RequestRow {
  id: string;
  studentId: string;
  mentorId: string;
  topic: string;
  message: string;
  status: string;
  createdAt: Date;
  student: { name: string };
  mentor: { user: { name: string } };
}

function mentorDto(m: MentorRow) {
  return { userId: m.userId, name: m.user.name, area: m.area, company: m.company, bio: m.bio, active: m.active };
}

function requestDto(r: RequestRow) {
  return {
    id: r.id,
    studentId: r.studentId,
    studentName: r.student.name,
    mentorId: r.mentorId,
    mentorName: r.mentor.user.name,
    topic: r.topic,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

const MENTOR_INC = { user: { select: { name: true } } } as const;
const REQUEST_INC = {
  student: { select: { name: true } },
  mentor: { include: { user: { select: { name: true } } } },
} as const;

@Injectable()
export class MentorshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMentors(user: AuthUser) {
    const rows = await this.prisma.mentor.findMany({
      where: user.role === 'admin' ? {} : { OR: [{ active: true }, { userId: user.id }] },
      include: MENTOR_INC,
      orderBy: { user: { name: 'asc' } },
    });
    return rows.map(mentorDto);
  }

  async becomeMentor(user: AuthUser, dto: BecomeMentorDto) {
    const fields = {
      area: dto.area.trim(),
      company: dto.company?.trim() ?? '',
      bio: dto.bio?.trim() ?? '',
    };
    const existing = await this.prisma.mentor.findUnique({ where: { userId: user.id } });
    const m = await this.prisma.mentor.upsert({
      where: { userId: user.id },
      update: { ...fields, active: true },
      create: { userId: user.id, ...fields },
      include: MENTOR_INC,
    });
    if (!existing) await this.audit.logBy(user.id, 'Novo mentor', `${m.user.name} · ${m.area}`);
    return mentorDto(m);
  }

  async setActive(user: AuthUser, active: boolean) {
    const m = await this.prisma.mentor.findUnique({ where: { userId: user.id } });
    if (!m) throw new NotFoundException('Ainda não és mentor.');
    const updated = await this.prisma.mentor.update({
      where: { userId: user.id },
      data: { active },
      include: MENTOR_INC,
    });
    return mentorDto(updated);
  }

  async listRequests(user: AuthUser) {
    const rows = await this.prisma.mentorshipRequest.findMany({
      where: user.role === 'admin' ? {} : { OR: [{ studentId: user.id }, { mentorId: user.id }] },
      include: REQUEST_INC,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return rows.map(requestDto);
  }

  async createRequest(user: AuthUser, dto: CreateRequestDto) {
    if (dto.mentorId === user.id) throw new BadRequestException('Não podes pedir mentoria a ti próprio.');
    const mentor = await this.prisma.mentor.findUnique({ where: { userId: dto.mentorId } });
    if (!mentor || !mentor.active) throw new NotFoundException('Mentor não encontrado ou inativo.');

    const duplicate = await this.prisma.mentorshipRequest.findFirst({
      where: { studentId: user.id, mentorId: dto.mentorId, status: 'pendente' },
    });
    if (duplicate) throw new ConflictException('Já tens um pedido pendente para este mentor.');

    const created = await this.prisma.mentorshipRequest.create({
      data: {
        studentId: user.id,
        mentorId: dto.mentorId,
        topic: dto.topic.trim(),
        message: dto.message?.trim() ?? '',
      },
      include: REQUEST_INC,
    });
    await this.notifications.notify(
      dto.mentorId,
      'Novo pedido de mentoria',
      `${created.student.name}: ${created.topic}`,
      '/app/estudante/mentoria',
    );
    return requestDto(created);
  }

  async respond(user: AuthUser, id: string, status: 'aceite' | 'recusada') {
    const r = await this.prisma.mentorshipRequest.findUnique({ where: { id }, include: REQUEST_INC });
    if (!r) throw new NotFoundException('Pedido não encontrado.');
    if (r.mentorId !== user.id) throw new ForbiddenException('Só o mentor pode responder a este pedido.');
    if (r.status !== 'pendente') throw new BadRequestException('Este pedido já foi respondido.');

    const updated = await this.prisma.mentorshipRequest.update({
      where: { id },
      data: { status },
      include: REQUEST_INC,
    });
    await this.audit.logBy(
      user.id,
      status === 'aceite' ? 'Mentoria aceite' : 'Mentoria recusada',
      `${updated.mentor.user.name} ↔ ${updated.student.name}`,
    );
    await this.notifications.notify(
      r.studentId,
      status === 'aceite' ? 'Mentoria aceite' : 'Mentoria recusada',
      `${updated.mentor.user.name} respondeu ao teu pedido: ${updated.topic}`,
      '/app/estudante/mentoria',
    );
    return requestDto(updated);
  }
}
