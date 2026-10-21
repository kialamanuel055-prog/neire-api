import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { CreateEventDto } from './dto/event.dto';

const INCLUDE = { registrations: { select: { userId: true } } } as const;

interface Row {
  id: string;
  title: string;
  type: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  capacity: number;
  registrations: { userId: string }[];
}

// Estudantes veem so o proprio identificador; os restantes inscritos aparecem como
// marcadores anonimos, para o contador continuar certo sem expor ninguem.
function toDto(e: Row, viewer: AuthUser) {
  const ids = e.registrations.map((r) => r.userId);
  let registered: string[];
  if (viewer.role === 'admin') {
    registered = ids;
  } else {
    const mine = ids.includes(viewer.id);
    const others = ids.length - (mine ? 1 : 0);
    registered = [...(mine ? [viewer.id] : []), ...Array.from({ length: others }, (_, i) => `anon-${i}`)];
  }
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    description: e.description,
    date: e.date.toISOString().slice(0, 10),
    time: e.time,
    location: e.location,
    capacity: e.capacity,
    registered,
  };
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.event.findMany({
      include: INCLUDE,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    return rows.map((e) => toDto(e, user));
  }

  async create(user: AuthUser, dto: CreateEventDto) {
    const created = await this.prisma.event.create({
      data: {
        title: dto.title.trim(),
        type: dto.type.trim(),
        description: dto.description?.trim() ?? '',
        date: new Date(dto.date),
        time: dto.time,
        location: dto.location.trim(),
        capacity: dto.capacity,
      },
      include: INCLUDE,
    });
    await this.audit.logBy(user.id, 'Evento criado', created.title);
    await this.notifications.notifyRoles(['student', 'alumni'], 'Novo evento', created.title, '/app/estudante/eventos');
    return toDto(created, user);
  }

  async setRegistration(user: AuthUser, id: string, registered: boolean) {
    const ev = await this.prisma.event.findUnique({ where: { id }, include: INCLUDE });
    if (!ev) throw new NotFoundException('Evento não encontrado.');
    const mine = ev.registrations.some((r) => r.userId === user.id);

    if (registered && !mine) {
      if (ev.registrations.length >= ev.capacity) throw new ConflictException('Este evento está lotado.');
      await this.prisma.eventRegistration.create({ data: { eventId: id, userId: user.id } });
    } else if (!registered && mine) {
      await this.prisma.eventRegistration.delete({ where: { eventId_userId: { eventId: id, userId: user.id } } });
    }

    const fresh = await this.prisma.event.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return toDto(fresh, user);
  }
}
