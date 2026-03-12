import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './assignment.entity';
import { Course } from '../course/course.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Notification } from '../notification/notification.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { User } from '../auth/user.entity';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(teacherId: number, dto: CreateAssignmentDto): Promise<Assignment> {
    const course = await this.courseRepository.findOneBy({ id: dto.courseId });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== teacherId) {
      throw new ForbiddenException('You can only create assignments for your courses');
    }

    if (new Date(dto.deadline) <= new Date()) {
      throw new BadRequestException('Deadline must be a future date and time');
    }

    const assignment = this.assignmentRepository.create({
      ...dto,
      createdById: teacherId,
    });
    const saved = await this.assignmentRepository.save(assignment);

    // Notify enrolled students about new assignment
    const teacher = await this.userRepository.findOneBy({ id: teacherId });
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: dto.courseId, status: 'enrolled' },
    });
    const notifications = enrollments.map((e) =>
      this.notificationRepository.create({
        userId: e.userId,
        title: 'New Assignment',
        message: `From: ${teacher?.name ?? 'Teacher'} | Course: ${course.title}\n\nNew assignment "${dto.title}". Deadline: ${new Date(dto.deadline).toLocaleDateString()}`,
        type: 'deadline',
        relatedId: saved.id,
      }),
    );
    if (notifications.length > 0) {
      await this.notificationRepository.save(notifications);
    }

    return saved;
  }

  async findByCourse(courseId: number): Promise<Assignment[]> {
    return this.assignmentRepository.find({
      where: { courseId },
      order: { deadline: 'ASC' },
      relations: ['submissions'],
    });
  }

  async findOne(id: number): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['course', 'submissions', 'submissions.student'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async update(
    id: number,
    teacherId: number,
    dto: UpdateAssignmentDto,
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOneBy({ id });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.createdById !== teacherId) {
      throw new ForbiddenException('You can only update your own assignments');
    }
    if (dto.deadline && new Date(dto.deadline) <= new Date()) {
      throw new BadRequestException('Deadline must be a future date and time');
    }
    Object.assign(assignment, dto);
    return this.assignmentRepository.save(assignment);
  }

  async delete(id: number, teacherId: number): Promise<void> {
    const assignment = await this.assignmentRepository.findOneBy({ id });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.createdById !== teacherId) {
      throw new ForbiddenException('You can only delete your own assignments');
    }
    await this.assignmentRepository.remove(assignment);
  }

  async getTeacherAssignments(teacherId: number): Promise<Assignment[]> {
    return this.assignmentRepository.find({
      where: { createdById: teacherId },
      relations: ['course', 'submissions'],
      order: { createdAt: 'DESC' },
    });
  }
}
