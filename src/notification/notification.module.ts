import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Course, Enrollment])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
