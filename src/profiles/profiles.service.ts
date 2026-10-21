import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';
import { AddProjectDto, AddSkillDto, UpdateProfileDto } from './dto/profile.dto';

const INCLUDE = {
  user: { select: { name: true } },
  skills: { orderBy: { id: 'asc' } },
  projects: { orderBy: { id: 'asc' } },
} as const;

interface Row {
  userId: string;
  course: string;
  year: string;
  location: string;
  headline: string;
  languages: string[];
  available: boolean;
  user: { name: string };
  skills: { name: string; category: string; level: string }[];
  projects: { id: string; title: string; description: string; link: string }[];
}

function toDto(p: Row) {
  return {
    userId: p.userId,
    name: p.user.name,
    course: p.course,
    year: p.year,
    location: p.location,
    headline: p.headline,
    languages: p.languages,
    available: p.available,
    skills: p.skills.map((s) => ({ name: s.name, category: s.category, level: s.level })),
    projects: p.projects.map((x) => ({ id: x.id, title: x.title, description: x.description, link: x.link })),
  };
}

// So aceita http/https; sem esquema, assume https.
function normalizeLink(raw?: string): string {
  const link = (raw ?? '').trim();
  if (!link) return '';
  if (/^https?:\/\//i.test(link)) return link;
  if (/^[a-z][a-z0-9+.-]*:/i.test(link)) {
    throw new BadRequestException('O link deve começar por http:// ou https://.');
  }
  return `https://${link}`;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  private ensure(userId: string) {
    return this.prisma.studentProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: INCLUDE,
    });
  }

  async me(user: AuthUser) {
    return toDto(await this.ensure(user.id));
  }

  async update(user: AuthUser, dto: UpdateProfileDto) {
    await this.ensure(user.id);
    const data: Prisma.StudentProfileUpdateInput = {};
    if (dto.headline !== undefined) data.headline = dto.headline.trim();
    if (dto.course !== undefined) data.course = dto.course.trim();
    if (dto.year !== undefined) data.year = dto.year.trim();
    if (dto.location !== undefined) data.location = dto.location.trim();
    if (dto.languages !== undefined) data.languages = dto.languages.map((l) => l.trim()).filter(Boolean);
    if (dto.available !== undefined) data.available = dto.available;
    const updated = await this.prisma.studentProfile.update({
      where: { userId: user.id },
      data,
      include: INCLUDE,
    });
    return toDto(updated);
  }

  async addSkill(user: AuthUser, dto: AddSkillDto) {
    await this.ensure(user.id);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Indica o nome da competência.');
    const exists = await this.prisma.skill.findFirst({
      where: { profileId: user.id, name: { equals: name, mode: 'insensitive' } },
    });
    if (!exists) {
      await this.prisma.skill.create({
        data: { profileId: user.id, name, category: dto.category.trim() },
      });
    }
    return this.me(user);
  }

  async removeSkill(user: AuthUser, name: string) {
    if (!name) throw new BadRequestException('Indica a competência a remover.');
    await this.prisma.skill.deleteMany({ where: { profileId: user.id, name } });
    return this.me(user);
  }

  async addProject(user: AuthUser, dto: AddProjectDto) {
    await this.ensure(user.id);
    await this.prisma.project.create({
      data: {
        profileId: user.id,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        link: normalizeLink(dto.link),
      },
    });
    return this.me(user);
  }

  async removeProject(user: AuthUser, id: string) {
    await this.prisma.project.deleteMany({ where: { id, profileId: user.id } });
    return this.me(user);
  }

  async list(user: AuthUser) {
    if (user.role === 'company') {
      const c = await this.prisma.company.findUnique({ where: { userId: user.id } });
      if (!c || (c.status !== 'verificada' && c.status !== 'ativa')) {
        throw new ForbiddenException('Só empresas verificadas podem aceder ao Banco de Talentos.');
      }
    }
    const rows = await this.prisma.studentProfile.findMany({
      where: user.role === 'admin' ? {} : { available: true },
      include: INCLUDE,
      orderBy: { user: { name: 'asc' } },
    });
    return rows.map(toDto);
  }
}
