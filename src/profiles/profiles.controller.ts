import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { AddProjectDto, AddSkillDto, UpdateProfileDto } from './dto/profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Roles('admin', 'company')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.profiles.list(user);
  }

  @Roles('student', 'alumni')
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.profiles.me(user);
  }

  @Roles('student', 'alumni')
  @Put('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(user, dto);
  }

  @Roles('student', 'alumni')
  @Post('me/skills')
  addSkill(@CurrentUser() user: AuthUser, @Body() dto: AddSkillDto) {
    return this.profiles.addSkill(user, dto);
  }

  @Roles('student', 'alumni')
  @Delete('me/skills')
  removeSkill(@CurrentUser() user: AuthUser, @Query('name') name: string) {
    return this.profiles.removeSkill(user, name);
  }

  @Roles('student', 'alumni')
  @Post('me/projects')
  addProject(@CurrentUser() user: AuthUser, @Body() dto: AddProjectDto) {
    return this.profiles.addProject(user, dto);
  }

  @Roles('student', 'alumni')
  @Delete('me/projects/:id')
  removeProject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.profiles.removeProject(user, id);
  }
}
