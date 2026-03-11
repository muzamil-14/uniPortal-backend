import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async sendMessage(teacherId: number, dto: SendMessageDto): Promise<Notification[]> {
    const course = await this.courseRepository.findOneBy({ id: dto.courseId });
    if (!course || course.instructorId !== teacherId) {
      throw new ForbiddenException('You can only message students in your courses');
    }

    const notifications = dto.studentIds.map((studentId) =>
      this.notificationRepository.create({
        userId: studentId,
        title: dto.title,
        message: dto.message,
        type: 'message',
        relatedId: dto.courseId,
      }),
    );
    return this.notificationRepository.save(notifications);
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    await this.notificationRepository.update(
      { id, userId },
      { isRead: true },
    );
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
    relatedId?: number,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      relatedId,
    });
    return this.notificationRepository.save(notification);
  }
}
