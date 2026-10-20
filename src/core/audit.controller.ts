import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('admin')
  @Get()
  list() {
    return this.audit.list();
  }
}
