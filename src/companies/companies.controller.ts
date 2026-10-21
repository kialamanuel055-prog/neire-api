import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CompaniesService } from './companies.service';
import { UpdateCompanyProfileDto } from './dto/company-profile.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Roles('admin', 'company')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.companies.list(user);
  }

  @Roles('company')
  @Get('me')
  profile(@CurrentUser() user: AuthUser) {
    return this.companies.getProfile(user);
  }

  @Roles('company')
  @Patch('me')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateCompanyProfileDto) {
    return this.companies.updateProfile(user, dto);
  }

  @Roles('admin')
  @Patch(':id/advance')
  advance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companies.advance(id, user.id);
  }
}
