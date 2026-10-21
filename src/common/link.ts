import { BadRequestException } from '@nestjs/common';

// So aceita http/https; sem esquema, assume https.
export function normalizeLink(raw?: string): string {
  const link = (raw ?? '').trim();
  if (!link) return '';
  if (/^https?:\/\//i.test(link)) return link;
  if (/^[a-z][a-z0-9+.-]*:/i.test(link)) {
    throw new BadRequestException('O link deve começar por http:// ou https://.');
  }
  return `https://${link}`;
}

export function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}
