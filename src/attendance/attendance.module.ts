import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './attendance.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { FeeVoucherModule } from '../fee-voucher/fee-voucher.module';
import { Enrollment } from '../enrollment/enrollment.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Enrollment, User]), FeeVoucherModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
