import { Module } from '@nestjs/common';
import { NotificationService } from './application/services/notification.service';

// Small, reusable module: the first real consumer of the previously-unused NotificationEvent
// model. Exports NotificationService so any bounded-context module (ba-review first) can inject it
// directly, same "shared service" pattern as AiModule/AiOrchestrationService.
@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
