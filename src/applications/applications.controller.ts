import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { ApplyDto, SetApplicationStatusDto } from './dto/application.dto';
import { ApplicationsService } from './applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.applications.list(user);
  }

  @Roles('student', 'alumni')
  @Post()
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyDto) {
    return this.applications.apply(user, dto);
  }

  @Roles('company', 'admin')
  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetApplicationStatusDto) {
    return this.applications.setStatus(user, id, dto.status);
  }
}
