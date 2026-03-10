import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './enrollment.entity';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async enroll(userId: number, courseId: number): Promise<Enrollment> {
    const existing = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    if (existing) {
      throw new ConflictException('Already enrolled in this course');
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
    await this.enrollmentRepository.remove(enrollment);
  }

  async isEnrolled(userId: number, courseId: number): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    return !!enrollment;
  }
}
