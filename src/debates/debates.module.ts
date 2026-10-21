import { Module } from '@nestjs/common';
import { DebateMatchesController, DebateTeamsController, DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [CertificatesModule],
  controllers: [DebatesController, DebateTeamsController, DebateMatchesController],
  providers: [DebatesService],
})
export class DebatesModule {}
