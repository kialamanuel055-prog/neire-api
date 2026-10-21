import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { BecomeMentorDto, SetActiveDto } from './dto/mentorship.dto';
import { MentorshipService } from './mentorship.service';

@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.mentorship.listMentors(user);
  }

  @Roles('alumni')
  @Post('me')
  become(@CurrentUser() user: AuthUser, @Body() dto: BecomeMentorDto) {
    return this.mentorship.becomeMentor(user, dto);
  }

  @Roles('alumni')
  @Patch('me/active')
  setActive(@CurrentUser() user: AuthUser, @Body() dto: SetActiveDto) {
    return this.mentorship.setActive(user, dto.active);
  }
}
