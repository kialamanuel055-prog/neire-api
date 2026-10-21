import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateArchiveDto } from './dto/archive.dto';
import { ArchiveService } from './archive.service';

@Controller('archive')
export class ArchiveController {
  constructor(private readonly archive: ArchiveService) {}

  @Roles('admin')
  @Get()
  list() {
    return this.archive.list();
  }

  @Roles('admin')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateArchiveDto) {
    return this.archive.create(user, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.archive.remove(user, id);
  }
}
