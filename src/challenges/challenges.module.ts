import { Module } from '@nestjs/common';
import {
  ChallengeSubmissionsController,
  ChallengeTeamsController,
  ChallengesController,
} from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [CertificatesModule],
  controllers: [ChallengesController, ChallengeTeamsController, ChallengeSubmissionsController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
