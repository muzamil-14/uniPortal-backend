import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { Enrollment } from '../enrollment/enrollment.entity';
import { User } from '../auth/user.entity';
import { FeeVoucherService } from '../fee-voucher/fee-voucher.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private feeVoucherService: FeeVoucherService,
  ) {}

  async markAttendance(dto: MarkAttendanceDto): Promise<Attendance[]> {
    const results: Attendance[] = [];
    for (const record of dto.records) {
      const student = await this.userRepository.findOneBy({ id: record.userId });
      if (!student) {
        throw new BadRequestException(
          `Student ${record.userId} does not exist for attendance marking.`,
        );
      }

      const activeEnrollment = await this.enrollmentRepository.findOneBy({
        userId: record.userId,
        courseId: dto.courseId,
        semesterNumber: student.currentSemester,
      });
      if (!activeEnrollment) {
        throw new BadRequestException(
          `Student ${record.userId} is not actively registered in this course for the current semester.`,
        );
      }

      await this.feeVoucherService.ensureSemesterChallanPaid(
        record.userId,
        student.currentSemester,
      );

      const existing = await this.attendanceRepository.findOneBy({
        userId: record.userId,
        courseId: dto.courseId,
        date: dto.date,
      });
      if (existing) {
        existing.status = record.status;
        results.push(await this.attendanceRepository.save(existing));
      } else {
        const attendance = this.attendanceRepository.create({
          userId: record.userId,
          courseId: dto.courseId,
          date: dto.date,
          status: record.status,
        });
        results.push(await this.attendanceRepository.save(attendance));
      }
    }
    return results;
  }

  async getCourseAttendance(
    courseId: number,
    date?: string,
  ): Promise<Attendance[]> {
    const where: any = { courseId };
    if (date) where.date = date;
    return this.attendanceRepository.find({
      where,
      relations: ['user'],
      order: { date: 'DESC' },
    });
  }

  async getStudentAttendance(userId: number): Promise<Attendance[]> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      return [];
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { userId, semesterNumber: user.currentSemester },
      select: ['courseId'],
    });
    const activeCourseIds = [...new Set(enrollments.map((e) => e.courseId))];
    if (activeCourseIds.length === 0) {
      return [];
    }

    return this.attendanceRepository.find({
      where: { userId, courseId: In(activeCourseIds) },
      relations: ['course'],
      order: { date: 'DESC' },
    });
  }

  async getStudentCourseAttendance(
    userId: number,
    courseId: number,
  ): Promise<Attendance[]> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      return [];
    }
    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
      semesterNumber: user.currentSemester,
    });
    if (!enrollment) {
      return [];
    }

    return this.attendanceRepository.find({
      where: { userId, courseId },
      order: { date: 'DESC' },
    });
  }

  async getAttendanceSummary(
    userId: number,
  ): Promise<{ courseId: number; courseName: string; total: number; present: number; absent: number; late: number; percentage: number }[]> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      return [];
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { userId, semesterNumber: user.currentSemester },
      select: ['courseId'],
    });
    const activeCourseIds = [...new Set(enrollments.map((e) => e.courseId))];
    if (activeCourseIds.length === 0) {
      return [];
    }

    const records = await this.attendanceRepository.find({
      where: { userId, courseId: In(activeCourseIds) },
      relations: ['course'],
    });

    const courseMap = new Map<number, { courseName: string; total: number; present: number; absent: number; late: number }>();

    for (const r of records) {
      if (!courseMap.has(r.courseId)) {
        courseMap.set(r.courseId, {
          courseName: r.course.title,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        });
      }
      const entry = courseMap.get(r.courseId)!;
      entry.total++;
      if (r.status === 'present') entry.present++;
      else if (r.status === 'absent') entry.absent++;
      else if (r.status === 'late') entry.late++;
    }

    return Array.from(courseMap.entries()).map(([courseId, data]) => ({
      courseId,
      ...data,
      percentage:
        data.total > 0
          ? Math.round(((data.present + data.late) / data.total) * 100)
          : 0,
    }));
  }
}
