import { Module } from '@nestjs/common';
import { CertificatesModule } from '../certificates/certificates.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [CertificatesModule],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
