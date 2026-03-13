import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { Course } from '../course/course.entity';
import { Notification } from '../notification/notification.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { User } from '../auth/user.entity';
import { FeeVoucherModule } from '../fee-voucher/fee-voucher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, Course, Notification, Enrollment, User]),
    FeeVoucherModule,
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
