import type { Request } from 'express';
import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: Role;
}

export interface AuthedRequest extends Request {
  user: AuthUser;
}
