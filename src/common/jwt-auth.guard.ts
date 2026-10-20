import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthedRequest } from './types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Sessão em falta.');

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: Role }>(token);
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
  }
}
