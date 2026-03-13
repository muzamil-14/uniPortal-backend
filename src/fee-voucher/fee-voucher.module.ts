import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeeVoucher } from './fee-voucher.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { Course } from '../course/course.entity';
import { User } from '../auth/user.entity';
import { FeeVoucherController } from './fee-voucher.controller';
import { FeeVoucherService } from './fee-voucher.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeeVoucher, Enrollment, Course, User])],
  controllers: [FeeVoucherController],
  providers: [FeeVoucherService],
  exports: [FeeVoucherService],
})
export class FeeVoucherModule {}
