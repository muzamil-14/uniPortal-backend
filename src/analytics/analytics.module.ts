import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { Attendance } from '../attendance/attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Enrollment, Attendance])],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
