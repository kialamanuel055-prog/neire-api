import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateNewsDto, SetPublishedDto } from './dto/content.dto';
import { ContentService } from './content.service';

@Controller('news')
export class NewsController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get()
  list() {
    return this.content.listNews(false);
  }

  @Roles('admin')
  @Get('all')
  listAll() {
    return this.content.listNews(true);
  }

  @Roles('admin')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNewsDto) {
    return this.content.createNews(user, dto);
  }

  @Roles('admin')
  @Patch(':id/published')
  setPublished(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetPublishedDto) {
    return this.content.setNewsPublished(user, id, dto.published);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.content.removeNews(user, id);
  }
}
