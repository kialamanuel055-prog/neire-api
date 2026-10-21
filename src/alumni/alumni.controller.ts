import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { BecomeAlumniDto, UpdateAlumniDto } from './dto/alumni.dto';
import { AlumniService } from './alumni.service';

@Controller('alumni')
export class AlumniController {
  constructor(private readonly alumni: AlumniService) {}

  @Get()
  list() {
    return this.alumni.list();
  }

  @Roles('student')
  @Post('become')
  @HttpCode(200)
  become(@CurrentUser() user: AuthUser, @Body() dto: BecomeAlumniDto) {
    return this.alumni.become(user, dto);
  }

  @Roles('alumni')
  @Put('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateAlumniDto) {
    return this.alumni.updateMe(user, dto);
  }
}
