import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { NewsController } from './news.controller';
import { StoriesController } from './stories.controller';

@Module({
  controllers: [NewsController, StoriesController],
  providers: [ContentService],
})
export class ContentModule {}
