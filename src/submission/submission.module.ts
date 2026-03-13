import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from './submission.entity';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { Assignment } from '../assignment/assignment.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { FeeVoucherModule } from '../fee-voucher/fee-voucher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Assignment, Enrollment]),
    FeeVoucherModule,
  ],
  controllers: [SubmissionController],
  providers: [SubmissionService],
})
export class SubmissionModule {}
