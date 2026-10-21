import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import { CertificatesService } from '../certificates/certificates.service';
import type { AuthUser } from '../common/types';
import { CreateCourseDto } from './dto/course.dto';

const INCLUDE = { enrollments: { select: { userId: true, completedAt: true } } } as const;

interface Row {
  id: string;
  title: string;
  kind: string;
  description: string;
  instructor: string;
  startDate: Date;
  hours: number;
  capacity: number;
  enrollments: { userId: string; completedAt: Date | null }[];
}

function toDto(c: Row, viewer: AuthUser) {
  const all = c.enrollments;
  let enrolled: string[];
  let completed: string[];
  if (viewer.role === 'admin') {
    enrolled = all.map((e) => e.userId);
    completed = all.filter((e) => e.completedAt).map((e) => e.userId);
  } else {
    const mine = all.find((e) => e.userId === viewer.id);
    const others = all.length - (mine ? 1 : 0);
    enrolled = [...(mine ? [viewer.id] : []), ...Array.from({ length: others }, (_, i) => `anon-${i}`)];
    completed = mine?.completedAt ? [viewer.id] : [];
  }
  return {
    id: c.id,
    title: c.title,
    kind: c.kind,
    description: c.description,
    instructor: c.instructor,
    startDate: c.startDate.toISOString().slice(0, 10),
    hours: c.hours,
    capacity: c.capacity,
    enrolled,
    completed,
  };
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly certificates: CertificatesService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.course.findMany({ include: INCLUDE, orderBy: { startDate: 'asc' } });
    return rows.map((c) => toDto(c, user));
  }

  async create(user: AuthUser, dto: CreateCourseDto) {
    const created = await this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        kind: dto.kind,
        description: dto.description?.trim() ?? '',
        instructor: dto.instructor?.trim() ?? '',
        startDate: new Date(dto.startDate),
        hours: dto.hours,
        capacity: dto.capacity,
      },
      include: INCLUDE,
    });
    await this.audit.logBy(user.id, 'Formação criada', created.title);
    return toDto(created, user);
  }

  async setEnrollment(user: AuthUser, id: string, enrolled: boolean) {
    const course = await this.prisma.course.findUnique({ where: { id }, include: INCLUDE });
    if (!course) throw new NotFoundException('Formação não encontrada.');
    const mine = course.enrollments.some((e) => e.userId === user.id);

    if (enrolled && !mine) {
      if (course.enrollments.length >= course.capacity) throw new ConflictException('Esta formação está lotada.');
      await this.prisma.courseEnrollment.create({ data: { courseId: id, userId: user.id } });
    } else if (!enrolled && mine) {
      await this.prisma.courseEnrollment.delete({ where: { courseId_userId: { courseId: id, userId: user.id } } });
    }

    const fresh = await this.prisma.course.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return toDto(fresh, user);
  }

  // Concluir uma formacao emite o certificado e notifica o participante.
  async complete(admin: AuthUser, id: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id }, include: INCLUDE });
    if (!course) throw new NotFoundException('Formação não encontrada.');
    const enrollment = course.enrollments.find((e) => e.userId === userId);
    if (!enrollment) throw new BadRequestException('O participante não está inscrito nesta formação.');

    if (!enrollment.completedAt) {
      await this.prisma.courseEnrollment.update({
        where: { courseId_userId: { courseId: id, userId } },
        data: { completedAt: new Date() },
      });
      const person = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await this.audit.logBy(admin.id, 'Formação concluída', `${course.title} · ${person?.name ?? userId}`);
      await this.notifications.notify(userId, 'Formação concluída', course.title, '/app/estudante/academia');
      await this.certificates.issueFor(userId, course.title, admin.id);
    }

    const fresh = await this.prisma.course.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return toDto(fresh, admin);
  }
}
