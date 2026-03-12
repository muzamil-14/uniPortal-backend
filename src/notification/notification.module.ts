import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationRealtimeService } from './notification-realtime.service';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Course, Enrollment, User])],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, NotificationRealtimeService],
  exports: [NotificationService],
})
export class NotificationModule {}
