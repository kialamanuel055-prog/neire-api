import { Module } from '@nestjs/common';
import { DebateMatchesController, DebateTeamsController, DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';

@Module({
  controllers: [DebatesController, DebateTeamsController, DebateMatchesController],
  providers: [DebatesService],
})
export class DebatesModule {}
