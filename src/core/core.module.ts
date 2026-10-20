import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  controllers: [AuditController, NotificationsController],
  providers: [AuditService, NotificationsService],
  exports: [AuditService, NotificationsService],
})
export class CoreModule {}
