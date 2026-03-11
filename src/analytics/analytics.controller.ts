import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { Attendance } from '../attendance/attendance.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('teacher')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  @Get('course/:courseId')
  async getCourseAnalytics(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course || course.instructorId !== req.user.userId) {
      throw new ForbiddenException('You can only view analytics for your courses');
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user'],
    });

    const attendanceRecords = await this.attendanceRepository.find({
      where: { courseId },
      relations: ['user'],
    });

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    let gradedCount = 0;
    let totalMarks = 0;
    for (const e of enrollments) {
      if (e.grade) {
        gradeDistribution[e.grade] = (gradeDistribution[e.grade] || 0) + 1;
        gradedCount++;
        if (e.marks) totalMarks += Number(e.marks);
      }
    }

    // Attendance analytics per student
    const studentAttendance: Record<number, { name: string; present: number; absent: number; late: number; total: number }> = {};
    for (const a of attendanceRecords) {
      if (!studentAttendance[a.userId]) {
        studentAttendance[a.userId] = {
          name: a.user?.name || 'Unknown',
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
        };
      }
      const s = studentAttendance[a.userId];
      s.total++;
      if (a.status === 'present') s.present++;
      else if (a.status === 'absent') s.absent++;
      else if (a.status === 'late') s.late++;
    }

    // Overall attendance stats
    const totalStudents = enrollments.length;
    const totalAttendanceDays = new Set(attendanceRecords.map((a) => a.date)).size;
    const overallPresent = attendanceRecords.filter((a) => a.status === 'present').length;
    const overallAbsent = attendanceRecords.filter((a) => a.status === 'absent').length;
    const overallLate = attendanceRecords.filter((a) => a.status === 'late').length;

    return {
      courseId,
      courseTitle: course.title,
      totalStudents,
      gradeAnalytics: {
        gradedCount,
        ungradedCount: totalStudents - gradedCount,
        averageMarks: gradedCount > 0 ? Math.round((totalMarks / gradedCount) * 100) / 100 : 0,
        distribution: gradeDistribution,
      },
      attendanceAnalytics: {
        totalDays: totalAttendanceDays,
        overallPresent,
        overallAbsent,
        overallLate,
        averageAttendanceRate:
          attendanceRecords.length > 0
            ? Math.round(((overallPresent + overallLate) / attendanceRecords.length) * 100)
            : 0,
        perStudent: Object.entries(studentAttendance).map(([userId, data]) => ({
          userId: Number(userId),
          ...data,
          percentage: data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0,
        })),
      },
    };
  }
}
