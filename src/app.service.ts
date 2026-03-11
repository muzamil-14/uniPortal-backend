import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getDashboardStats() {
    const [students] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM user WHERE role = ?',
      ['student'],
    );
    const [teachers] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM user WHERE role = ?',
      ['teacher'],
    );
    const [courses] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM course',
    );
    const [activeCourses] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM course WHERE isActive = 1',
    );
    const [enrollments] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM enrollment',
    );
    const [departments] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM department',
    );

    return {
      totalStudents: Number(students.count),
      totalTeachers: Number(teachers.count),
      totalCourses: Number(courses.count),
      activeCourses: Number(activeCourses.count),
      totalEnrollments: Number(enrollments.count),
      totalDepartments: Number(departments.count),
    };
  }

  async getTeacherDashboardStats(teacherId: number) {
    const [courses] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM course WHERE instructorId = ?',
      [teacherId],
    );
    const [students] = await this.dataSource.query(
      'SELECT COUNT(DISTINCT e.userId) as count FROM enrollment e INNER JOIN course c ON e.courseId = c.id WHERE c.instructorId = ?',
      [teacherId],
    );
    const [graded] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM enrollment e INNER JOIN course c ON e.courseId = c.id WHERE c.instructorId = ? AND e.status = ?',
      [teacherId, 'completed'],
    );
    const [pending] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM enrollment e INNER JOIN course c ON e.courseId = c.id WHERE c.instructorId = ? AND e.status = ?',
      [teacherId, 'enrolled'],
    );

    return {
      totalCourses: Number(courses.count),
      totalStudents: Number(students.count),
      gradedStudents: Number(graded.count),
      pendingGrades: Number(pending.count),
    };
  }
}
