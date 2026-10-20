import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  check() {
    return { status: 'ok', time: new Date().toISOString() };
  }

  // Faz uma consulta real a base de dados: serve de "sinal de vida" para o Supabase.
  @Public()
  @Get('db')
  async db() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up', time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException('Base de dados indisponivel.');
    }
  }
}
