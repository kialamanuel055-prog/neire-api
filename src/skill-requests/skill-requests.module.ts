import { Module } from '@nestjs/common';
import { SkillRequestsController } from './skill-requests.controller';
import { SkillRequestsService } from './skill-requests.service';

@Module({
  controllers: [SkillRequestsController],
  providers: [SkillRequestsService],
})
export class SkillRequestsModule {}
