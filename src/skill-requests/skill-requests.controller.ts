import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateSkillRequestDto, DecideSkillRequestDto } from './dto/skill-request.dto';
import { SkillRequestsService } from './skill-requests.service';

@Controller('skill-requests')
export class SkillRequestsController {
  constructor(private readonly requests: SkillRequestsService) {}

  @Roles('student', 'alumni', 'admin')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.requests.list(user);
  }

  @Roles('student', 'alumni')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSkillRequestDto) {
    return this.requests.create(user, dto);
  }

  @Roles('admin')
  @Patch(':id/decide')
  decide(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DecideSkillRequestDto) {
    return this.requests.decide(user, id, dto);
  }
}
