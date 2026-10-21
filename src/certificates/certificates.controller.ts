import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { RateLimit } from '../common/rate-limit.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { IssueCertificateDto } from './dto/certificate.dto';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Public()
  @RateLimit({ limit: 40, seconds: 600, by: 'ip' })
  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificates.verify(code);
  }

  @Roles('student', 'alumni', 'admin')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.certificates.list(user);
  }

  @Roles('admin')
  @Post()
  issue(@CurrentUser() user: AuthUser, @Body() dto: IssueCertificateDto) {
    return this.certificates.issueManual(user, dto);
  }
}
