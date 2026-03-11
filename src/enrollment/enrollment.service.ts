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

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
    return this.enrollmentRepository.save(enrollment);
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
}
