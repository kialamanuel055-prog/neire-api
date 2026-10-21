import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateEventDto, SetRegistrationDto } from './dto/event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.events.list(user);
  }

  @Roles('admin')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.events.create(user, dto);
  }

  @Roles('student', 'alumni')
  @Put(':id/registration')
  setRegistration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetRegistrationDto) {
    return this.events.setRegistration(user, id, dto.registered);
  }
}
