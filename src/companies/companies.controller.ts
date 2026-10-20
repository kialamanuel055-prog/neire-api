import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Roles('admin', 'company')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.companies.list(user);
  }

  @Roles('admin')
  @Patch(':id/advance')
  advance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companies.advance(id, user.id);
  }
}
