import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { CoreModule } from './core/core.module';
import { CompaniesModule } from './companies/companies.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ApplicationsModule } from './applications/applications.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SkillRequestsModule } from './skill-requests/skill-requests.module';
import { AlumniModule } from './alumni/alumni.module';
import { CertificatesModule } from './certificates/certificates.module';
import { EventsModule } from './events/events.module';
import { CoursesModule } from './courses/courses.module';
import { RateLimitGuard } from './common/rate-limit.guard';
// ANCHOR:module-imports

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CoreModule,
    CompaniesModule,
    OpportunitiesModule,
    ApplicationsModule,
    ProfilesModule,
    SkillRequestsModule,
    AlumniModule,
    CertificatesModule,
    EventsModule,
    CoursesModule,
    // ANCHOR:app-modules
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
