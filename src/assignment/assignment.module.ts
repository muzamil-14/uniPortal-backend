import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { Course } from '../course/course.entity';
import { Notification } from '../notification/notification.entity';
import { Enrollment } from '../enrollment/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Course, Notification, Enrollment])],
  controllers: [AssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
