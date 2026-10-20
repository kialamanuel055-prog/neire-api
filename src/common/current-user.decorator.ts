import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedRequest, AuthUser } from './types';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});
