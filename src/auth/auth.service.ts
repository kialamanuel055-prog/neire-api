import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'alumni' | 'company' | 'admin';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Já existe uma conta com este email.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: dto.name.trim(), email, passwordHash, role: dto.role },
      });
      if (dto.role === 'student') {
        await tx.studentProfile.create({
          data: { userId: created.id, course: dto.course?.trim() ?? '', year: dto.year?.trim() ?? '' },
        });
      } else {
        await tx.company.create({
          data: {
            userId: created.id,
            name: created.name,
            sector: dto.sector?.trim() ?? '',
            website: dto.website?.trim() ?? '',
          },
        });
      }
      return created;
    });

    return this.session(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !ok) throw new UnauthorizedException('Email ou palavra-passe incorretos.');
    return this.session(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilizador não encontrado.');
    return this.toPublic(user);
  }

  private toPublic(user: { id: string; name: string; email: string; role: PublicUser['role'] }): PublicUser {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  private session(user: { id: string; name: string; email: string; role: PublicUser['role'] }) {
    const token = this.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: this.toPublic(user) };
  }
}
