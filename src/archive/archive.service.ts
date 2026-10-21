import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import type { AuthUser } from '../common/types';
import { CreateArchiveDto } from './dto/archive.dto';

interface Row {
  id: string;
  title: string;
  category: string;
  description: string;
  link: string;
  uploadedBy: string;
  createdAt: Date;
}

function toDto(d: Row) {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    description: d.description,
    link: d.link,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt.toISOString(),
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
export class ArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const rows = await this.prisma.archiveDoc.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 });
    return rows.map(toDto);
  }

  async create(user: AuthUser, dto: CreateArchiveDto) {
    const who = await this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
    const created = await this.prisma.archiveDoc.create({
      data: {
        title: dto.title.trim(),
        category: dto.category.trim(),
        description: dto.description?.trim() ?? '',
        link: normalizeLink(dto.link),
        uploadedBy: who?.name ?? 'admin',
      },
    });
    await this.audit.logBy(user.id, 'Documento arquivado', `${created.title} (${created.category})`);
    return toDto(created);
  }

  async remove(user: AuthUser, id: string) {
    const d = await this.prisma.archiveDoc.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Documento não encontrado.');
    await this.prisma.archiveDoc.delete({ where: { id } });
    await this.audit.logBy(user.id, 'Documento removido do arquivo', d.title);
    return { ok: true };
  }
}
