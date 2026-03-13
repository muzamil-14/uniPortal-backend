import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SemesterConfig } from './semester-config.entity';
import { StudentSemester } from './student-semester.entity';
import { SemesterService } from './semester.service';
import { SemesterController } from './semester.controller';
import { User } from '../auth/user.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { Course } from '../course/course.entity';
import { FeeVoucherModule } from '../fee-voucher/fee-voucher.module';

@Module({
  imports: [
    FeeVoucherModule,
    TypeOrmModule.forFeature([
      SemesterConfig,
      StudentSemester,
      User,
      Enrollment,
      Course,
    ]),
  ],
  controllers: [SemesterController],
  providers: [SemesterService],
  exports: [SemesterService],
})
export class SemesterModule {}
