import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CompleteCourseDto, CreateCourseDto, SetEnrollmentDto } from './dto/course.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.courses.list(user);
  }

  @Roles('admin')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.courses.create(user, dto);
  }

  @Roles('student', 'alumni')
  @Put(':id/enrollment')
  setEnrollment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetEnrollmentDto) {
    return this.courses.setEnrollment(user, id, dto.enrolled);
  }

  @Roles('admin')
  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CompleteCourseDto) {
    return this.courses.complete(user, id, dto.userId);
  }
}
