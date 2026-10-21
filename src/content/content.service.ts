import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import type { AuthUser } from '../common/types';
import { CreateNewsDto, CreateStoryDto } from './dto/content.dto';

interface NewsRow {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  date: Date;
  published: boolean;
}
interface StoryRow {
  id: string;
  title: string;
  personName: string;
  role: string;
  story: string;
  date: Date;
  published: boolean;
}

function newsDto(n: NewsRow) {
  return {
    id: n.id,
    title: n.title,
    category: n.category,
    summary: n.summary,
    body: n.body,
    date: n.date.toISOString().slice(0, 10),
    published: n.published,
  };
}

function storyDto(s: StoryRow) {
  return {
    id: s.id,
    title: s.title,
    personName: s.personName,
    role: s.role,
    story: s.story,
    date: s.date.toISOString().slice(0, 10),
    published: s.published,
  };
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- noticias ----------
  async listNews(all: boolean) {
    const rows = await this.prisma.newsItem.findMany({
      where: all ? {} : { published: true },
      orderBy: { date: 'desc' },
      take: 500,
    });
    return rows.map(newsDto);
  }

  async createNews(user: AuthUser, dto: CreateNewsDto) {
    const created = await this.prisma.newsItem.create({
      data: {
        title: dto.title.trim(),
        category: dto.category.trim(),
        summary: dto.summary.trim(),
        body: dto.body?.trim() ?? '',
        date: new Date(dto.date.slice(0, 10)),
        published: dto.published ?? true,
      },
    });
    await this.audit.logBy(user.id, 'Notícia criada', created.title);
    return newsDto(created);
  }

  async setNewsPublished(user: AuthUser, id: string, published: boolean) {
    const n = await this.prisma.newsItem.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notícia não encontrada.');
    const updated = await this.prisma.newsItem.update({ where: { id }, data: { published } });
    await this.audit.logBy(user.id, published ? 'Notícia publicada' : 'Notícia ocultada', updated.title);
    return newsDto(updated);
  }

  async removeNews(user: AuthUser, id: string) {
    const n = await this.prisma.newsItem.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notícia não encontrada.');
    await this.prisma.newsItem.delete({ where: { id } });
    await this.audit.logBy(user.id, 'Notícia apagada', n.title);
    return { ok: true };
  }

  // ---------- historias de impacto ----------
  async listStories(all: boolean) {
    const rows = await this.prisma.impactStory.findMany({
      where: all ? {} : { published: true },
      orderBy: { date: 'desc' },
      take: 500,
    });
    return rows.map(storyDto);
  }

  async createStory(user: AuthUser, dto: CreateStoryDto) {
    const created = await this.prisma.impactStory.create({
      data: {
        title: dto.title.trim(),
        personName: dto.personName.trim(),
        role: dto.role.trim(),
        story: dto.story.trim(),
        date: new Date(dto.date.slice(0, 10)),
        published: dto.published ?? true,
      },
    });
    await this.audit.logBy(user.id, 'História de impacto criada', created.title);
    return storyDto(created);
  }

  async setStoryPublished(user: AuthUser, id: string, published: boolean) {
    const s = await this.prisma.impactStory.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('História não encontrada.');
    const updated = await this.prisma.impactStory.update({ where: { id }, data: { published } });
    await this.audit.logBy(user.id, published ? 'História publicada' : 'História ocultada', updated.title);
    return storyDto(updated);
  }

  async removeStory(user: AuthUser, id: string) {
    const s = await this.prisma.impactStory.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('História não encontrada.');
    await this.prisma.impactStory.delete({ where: { id } });
    await this.audit.logBy(user.id, 'História apagada', s.title);
    return { ok: true };
  }
}
