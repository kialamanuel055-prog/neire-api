import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MentorshipRequestsController } from './mentorship-requests.controller';
import { MentorshipService } from './mentorship.service';

@Module({
  controllers: [MentorsController, MentorshipRequestsController],
  providers: [MentorshipService],
})
export class MentorshipModule {}
