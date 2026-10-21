import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY } from './rate-limit.decorator';
import type { RateLimitRule } from './rate-limit.decorator';

interface Bucket {
  count: number;
  resetAt: number;
}
interface Req {
  ip?: string;
  body?: { email?: unknown };
}
interface Res {
  setHeader(name: string, value: string): void;
}

// Limite geral por IP: largo, porque varios estudantes partilham o mesmo Wi-Fi.
const GLOBAL: RateLimitRule = { limit: 600, seconds: 60, by: 'ip' };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {
    const timer = setInterval(() => this.purge(), 60_000);
    timer.unref();
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    if (context.getClass().name === 'HealthController') return true;

    const http = context.switchToHttp();
    const req = http.getRequest<Req>();
    const res = http.getResponse<Res>();
    const ip = req.ip ?? 'desconhecido';
    const scope = `${context.getClass().name}.${context.getHandler().name}`;

    this.check(res, `global:${ip}`, GLOBAL);

    const rules =
      this.reflector.getAllAndOverride<RateLimitRule[] | undefined>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    for (const rule of rules) {
      let key = `${scope}:ip:${ip}`;
      if (rule.by === 'email') {
        const raw = req.body?.email;
        const email = typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 200) : '';
        key = `${scope}:email:${email || ip}`;
      }
      this.check(res, key, rule);
    }
    return true;
  }

  private check(res: Res, key: string, rule: RateLimitRule) {
    const now = Date.now();
    const windowMs = rule.seconds * 1000;
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > rule.limit) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      const minutes = Math.max(1, Math.ceil(retry / 60));
      throw new HttpException(
        `Demasiadas tentativas. Tenta novamente dentro de ${minutes} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private purge() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
