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
    // ANCHOR:app-modules
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
