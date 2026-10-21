import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';
import { CreateFeedbackDto } from './dto/feedback.dto';

interface Row {
  id: string;
  kind: string;
  targetId: string;
  targetTitle: string;
  userId: string;
  ratings: unknown;
  comment: string;
  at: Date;
  user: { name: string };
}

function toDto(f: Row) {
  return {
    id: f.id,
    kind: f.kind,
    targetId: f.targetId,
    targetTitle: f.targetTitle,
    userId: f.userId,
    userName: f.user.name,
    ratings: f.ratings as Record<string, number>,
    comment: f.comment,
    at: f.at.toISOString(),
  };
}

const INCLUDE = { user: { select: { name: true } } } as const;

function cleanRatings(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException('Avaliação inválida.');
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 10) {
    throw new BadRequestException('Indica entre 1 e 10 critérios de avaliação.');
  }
  const out: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (key.length === 0 || key.length > 40) throw new BadRequestException('Critério inválido.');
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
      throw new BadRequestException('As notas devem ser números inteiros de 1 a 5.');
    }
    out[key] = value;
  }
  return out;
}

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.feedback.findMany({
      where: user.role === 'admin' ? {} : { userId: user.id },
      include: INCLUDE,
      orderBy: { at: 'desc' },
      take: 2000,
    });
    return rows.map(toDto);
  }

  async create(user: AuthUser, dto: CreateFeedbackDto) {
    const ratings = cleanRatings(dto.ratings);

    let targetTitle: string;
    if (dto.kind === 'evento') {
      const ev = await this.prisma.event.findUnique({
        where: { id: dto.targetId },
        select: { title: true, registrations: { where: { userId: user.id }, select: { userId: true } } },
      });
      if (!ev) throw new NotFoundException('Evento não encontrado.');
      if (ev.registrations.length === 0) {
        throw new BadRequestException('Só podes avaliar eventos em que te inscreveste.');
      }
      targetTitle = ev.title;
    } else {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.targetId },
        select: { title: true, enrollments: { where: { userId: user.id }, select: { userId: true } } },
      });
      if (!course) throw new NotFoundException('Formação não encontrada.');
      if (course.enrollments.length === 0) {
        throw new BadRequestException('Só podes avaliar formações em que te inscreveste.');
      }
      targetTitle = course.title;
    }

    const exists = await this.prisma.feedback.findUnique({
      where: { kind_targetId_userId: { kind: dto.kind, targetId: dto.targetId, userId: user.id } },
    });
    if (exists) throw new ConflictException('Já avaliaste este item.');

    const created = await this.prisma.feedback.create({
      data: {
        kind: dto.kind,
        targetId: dto.targetId,
        targetTitle,
        userId: user.id,
        ratings: ratings as Prisma.InputJsonValue,
        comment: dto.comment?.trim() ?? '',
      },
      include: INCLUDE,
    });
    return toDto(created);
  }
}
