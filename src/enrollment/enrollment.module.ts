import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './enrollment.entity';
import { Course } from '../course/course.entity';
import { User } from '../auth/user.entity';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { NotificationModule } from '../notification/notification.module';
import { FeeVoucherModule } from '../fee-voucher/fee-voucher.module';
import { SemesterModule } from '../semester/semester.module';
import { StudentSemester } from '../semester/student-semester.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, Course, User, StudentSemester]),
    NotificationModule,
    FeeVoucherModule,
    SemesterModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
