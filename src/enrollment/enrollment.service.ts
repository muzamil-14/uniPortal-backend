import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { Course } from '../course/course.entity';
import { User } from '../auth/user.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
  ) {}

  async enroll(userId: number, courseId: number): Promise<Enrollment> {
    const existing = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    if (existing) {
      throw new ConflictException('Already enrolled in this course');
    }

    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.departments && course.departments.length > 0) {
      const student = await this.userRepository.findOneBy({ id: userId });
      if (!student || !course.departments.includes(student.department)) {
        throw new BadRequestException(
          'You can only enroll in courses from your department',
        );
      }
    }

    const enrollment = this.enrollmentRepository.create({ userId, courseId });
    return this.enrollmentRepository.save(enrollment);
  }

  async getUserEnrollments(userId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async getCourseEnrollments(courseId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user'],
    });
  }

  async unenroll(userId: number, courseId: number): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.status === 'completed') {
      throw new BadRequestException(
        'Cannot drop a completed course. The grade has been finalized.',
      );
    }
    await this.enrollmentRepository.remove(enrollment);
  }

  async isEnrolled(userId: number, courseId: number): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    return !!enrollment;
  }

  async assignGrade(
    userId: number,
    courseId: number,
    grade: string,
    marks?: number,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    enrollment.grade = grade;
    enrollment.status = 'completed';
    if (marks !== undefined) enrollment.marks = marks;
    const saved = await this.enrollmentRepository.save(enrollment);

    // Send grade notification
    const course = await this.courseRepository.findOneBy({ id: courseId });
    await this.notificationService.createNotification(
      userId,
      'Grade Published',
      `Your grade for ${course?.title || 'a course'} has been posted: ${grade}${marks !== undefined ? ` (${marks} marks)` : ''}`,
      'grade',
      courseId,
    );

    return saved;
  }

  async assignGradeAsTeacher(
    teacherId: number,
    userId: number,
    courseId: number,
    grade: string,
    marks?: number,
  ): Promise<Enrollment> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course || course.instructorId !== teacherId) {
      throw new ForbiddenException(
        'You can only assign grades for courses you teach',
      );
    }
    return this.assignGrade(userId, courseId, grade, marks);
  }

  async getStudentGrades(userId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async getAllEnrollmentsWithGrades(courseId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user', 'course'],
      order: { enrolledAt: 'ASC' },
    });
  }

  async getTeacherCourseEnrollments(
    teacherId: number,
    courseId: number,
  ): Promise<Enrollment[]> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course || course.instructorId !== teacherId) {
      throw new ForbiddenException(
        'You can only view students for courses you teach',
      );
    }
    return this.getAllEnrollmentsWithGrades(courseId);
  }

  async getResultCard(userId: number) {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId, status: 'completed' },
      relations: ['course'],
      order: { enrolledAt: 'ASC' },
    });

    if (enrollments.length === 0) {
      return { courses: [], totalCredits: 0, gpa: 0 };
    }

    const gradePoints: Record<string, number> = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0,
    };

    let totalPoints = 0;
    let totalCredits = 0;

    const courses = enrollments.map((e) => {
      const credits = e.course.creditHours;
      const gp = gradePoints[e.grade] ?? 0;
      totalPoints += gp * credits;
      totalCredits += credits;
      return {
        courseId: e.courseId,
        courseTitle: e.course.title,
        instructor: e.course.instructor,
        creditHours: credits,
        grade: e.grade,
        marks: e.marks,
        gradePoints: gp,
      };
    });

    return {
      courses,
      totalCredits,
      gpa: totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0,
    };
  }
}
