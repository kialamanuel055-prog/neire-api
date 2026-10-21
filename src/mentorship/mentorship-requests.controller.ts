import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateRequestDto, RespondDto } from './dto/mentorship.dto';
import { MentorshipService } from './mentorship.service';

@Controller('mentorship-requests')
export class MentorshipRequestsController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Roles('student', 'alumni', 'admin')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.mentorship.listRequests(user);
  }

  @Roles('student', 'alumni')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    return this.mentorship.createRequest(user, dto);
  }

  @Roles('alumni')
  @Patch(':id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RespondDto) {
    return this.mentorship.respond(user, id, dto.status);
  }
}
