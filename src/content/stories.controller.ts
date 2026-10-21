import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateStoryDto, SetPublishedDto } from './dto/content.dto';
import { ContentService } from './content.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get()
  list() {
    return this.content.listStories(false);
  }

  @Roles('admin')
  @Get('all')
  listAll() {
    return this.content.listStories(true);
  }

  @Roles('admin')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStoryDto) {
    return this.content.createStory(user, dto);
  }

  @Roles('admin')
  @Patch(':id/published')
  setPublished(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetPublishedDto) {
    return this.content.setStoryPublished(user, id, dto.published);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.content.removeStory(user, id);
  }
}
