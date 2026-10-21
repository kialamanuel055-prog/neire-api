import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Roles('student', 'alumni', 'admin')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.feedback.list(user);
  }

  @Roles('student', 'alumni')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(user, dto);
  }
}
