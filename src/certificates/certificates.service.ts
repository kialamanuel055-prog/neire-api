import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';
import { NotificationsService } from '../core/notifications.service';
import type { AuthUser } from '../common/types';
import { IssueCertificateDto } from './dto/certificate.dto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET.charAt(randomInt(0, ALPHABET.length));
  return `NEIRE-${s.slice(0, 4)}-${s.slice(4)}`;
}

interface Row {
  id: string;
  code: string;
  studentId: string;
  studentName: string;
  activity: string;
  issuer: string;
  issuedAt: Date;
}

function toDto(c: Row) {
  return {
    id: c.id,
    code: c.code,
    studentId: c.studentId,
    studentName: c.studentName,
    activity: c.activity,
    issuer: c.issuer,
    issuedAt: c.issuedAt.toISOString(),
  };
}

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async uniqueCode(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = makeCode();
      const exists = await this.prisma.certificate.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new BadRequestException('Não foi possível gerar um código único. Tenta novamente.');
  }

  // Usado tambem pelo modulo de formacoes ao concluir.
  async issueFor(userId: string, activity: string, actorId?: string) {
    const student = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!student) throw new NotFoundException('Estudante não encontrado.');

    const cert = await this.prisma.certificate.create({
      data: {
        code: await this.uniqueCode(),
        studentId: userId,
        studentName: student.name,
        activity,
        issuer: 'NEIRE · INSTIC',
      },
    });
    const detail = `${student.name} · ${activity} · ${cert.code}`;
    if (actorId) await this.audit.logBy(actorId, 'Certificado emitido', detail);
    else await this.audit.log('sistema', 'Certificado emitido', detail);
    await this.notifications.notify(
      userId,
      'Novo certificado',
      `Recebeste um certificado: ${activity}`,
      '/app/estudante/certificados',
    );
    return toDto(cert);
  }

  async list(user: AuthUser) {
    const rows = await this.prisma.certificate.findMany({
      where: user.role === 'admin' ? {} : { studentId: user.id },
      orderBy: { issuedAt: 'desc' },
      take: 500,
    });
    return rows.map(toDto);
  }

  async issueManual(admin: AuthUser, dto: IssueCertificateDto) {
    const target = await this.prisma.user.findUnique({ where: { id: dto.studentId }, select: { role: true } });
    if (!target) throw new NotFoundException('Estudante não encontrado.');
    if (target.role !== 'student' && target.role !== 'alumni') {
      throw new BadRequestException('O destinatário tem de ser estudante ou Alumni.');
    }
    return this.issueFor(dto.studentId, dto.activity.trim(), admin.id);
  }

  // Publico: so devolve o que e preciso para confirmar a autenticidade.
  async verify(rawCode: string) {
    const code = (rawCode ?? '').trim().toUpperCase();
    if (!/^NEIRE-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) throw new NotFoundException('Certificado não encontrado.');
    const cert = await this.prisma.certificate.findUnique({ where: { code } });
    if (!cert) throw new NotFoundException('Certificado não encontrado.');
    return {
      valid: true,
      code: cert.code,
      studentName: cert.studentName,
      activity: cert.activity,
      issuer: cert.issuer,
      issuedAt: cert.issuedAt.toISOString(),
    };
  }
}
