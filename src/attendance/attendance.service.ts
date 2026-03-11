import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async markAttendance(dto: MarkAttendanceDto): Promise<Attendance[]> {
    const results: Attendance[] = [];
    for (const record of dto.records) {
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
    return this.attendanceRepository.find({
      where: { userId },
      relations: ['course'],
      order: { date: 'DESC' },
    });
  }

  async getStudentCourseAttendance(
    userId: number,
    courseId: number,
  ): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: { userId, courseId },
      order: { date: 'DESC' },
    });
  }

  async getAttendanceSummary(
    userId: number,
  ): Promise<{ courseId: number; courseName: string; total: number; present: number; absent: number; late: number; percentage: number }[]> {
    const records = await this.attendanceRepository.find({
      where: { userId },
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
