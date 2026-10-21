import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { RateLimit } from '../common/rate-limit.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateComplaintDto, SetComplaintStatusDto } from './dto/complaint.dto';
import { ComplaintsService } from './complaints.service';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.complaints.list(user);
  }

  @RateLimit({ limit: 20, seconds: 3600, by: 'ip' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateComplaintDto) {
    return this.complaints.create(user, dto);
  }

  @Roles('admin')
  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetComplaintStatusDto) {
    return this.complaints.setStatus(user, id, dto);
  }
}
