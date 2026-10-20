import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import type { AuthedRequest } from './types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenException('Sem permissão para esta ação.');
    }
    return true;
  }
}
