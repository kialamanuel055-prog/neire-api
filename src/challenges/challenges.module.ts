import { Module } from '@nestjs/common';
import {
  ChallengeSubmissionsController,
  ChallengeTeamsController,
  ChallengesController,
} from './challenges.controller';
import { ChallengesService } from './challenges.service';

@Module({
  controllers: [ChallengesController, ChallengeTeamsController, ChallengeSubmissionsController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
