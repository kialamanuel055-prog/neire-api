import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import type { AuthUser } from '../common/types';
import { BecomeAlumniDto, UpdateAlumniDto } from './dto/alumni.dto';

interface Row {
  userId: string;
  graduationYear: string;
  company: string;
  position: string;
  bio: string;
  offersMentoring: boolean;
  user: { name: string };
}

function toDto(g: Row) {
  return {
    userId: g.userId,
    name: g.user.name,
    graduationYear: g.graduationYear,
    company: g.company,
    position: g.position,
    bio: g.bio,
    offersMentoring: g.offersMentoring,
  };
}

const INCLUDE = { user: { select: { name: true } } } as const;

@Injectable()
export class AlumniService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const rows = await this.prisma.graduateProfile.findMany({
      include: INCLUDE,
      orderBy: { user: { name: 'asc' } },
    });
    return rows.map(toDto);
  }

  async become(user: AuthUser, dto: BecomeAlumniDto) {
    const u = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!u) throw new NotFoundException('Utilizador não encontrado.');
    if (u.role !== 'student' && u.role !== 'alumni') {
      throw new ForbiddenException('Só estudantes podem passar a Alumni.');
    }

    const current = u.role === 'alumni' ? u : await this.prisma.user.update({ where: { id: u.id }, data: { role: 'alumni' } });
    const fields = {
      graduationYear: dto.graduationYear?.trim() ?? '',
      company: dto.company?.trim() ?? '',
      position: dto.position?.trim() ?? '',
    };
    await this.prisma.graduateProfile.upsert({
      where: { userId: u.id },
      update: fields,
      create: { userId: u.id, ...fields },
    });
    await this.prisma.studentProfile.upsert({
      where: { userId: u.id },
      update: { year: 'Graduado' },
      create: { userId: u.id, year: 'Graduado' },
    });
    if (u.role !== 'alumni') await this.audit.log(current.name, 'Passou a Alumni', current.email);

    const token = this.jwt.sign({ sub: current.id, role: current.role });
    return {
      token,
      user: { id: current.id, name: current.name, email: current.email, role: current.role },
    };
  }

  async updateMe(user: AuthUser, dto: UpdateAlumniDto) {
    const fields: {
      graduationYear?: string;
      company?: string;
      position?: string;
      bio?: string;
      offersMentoring?: boolean;
    } = {};
    if (dto.graduationYear !== undefined) fields.graduationYear = dto.graduationYear.trim();
    if (dto.company !== undefined) fields.company = dto.company.trim();
    if (dto.position !== undefined) fields.position = dto.position.trim();
    if (dto.bio !== undefined) fields.bio = dto.bio.trim();
    if (dto.offersMentoring !== undefined) fields.offersMentoring = dto.offersMentoring;

    const g = await this.prisma.graduateProfile.upsert({
      where: { userId: user.id },
      update: fields,
      create: { userId: user.id, ...fields },
      include: INCLUDE,
    });
    return toDto(g);
  }
}
