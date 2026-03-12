import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { User } from '../auth/user.entity';
import { NotificationRealtimeService } from './notification-realtime.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationRealtimeService: NotificationRealtimeService,
  ) {}

  async sendMessage(teacherId: number, dto: SendMessageDto): Promise<Notification[]> {
    const course = await this.courseRepository.findOneBy({ id: dto.courseId });
    if (!course || course.instructorId !== teacherId) {
      throw new ForbiddenException('You can only message students in your courses');
    }

    const teacher = await this.userRepository.findOneBy({ id: teacherId });

    const notifications = dto.studentIds.map((studentId) =>
      this.notificationRepository.create({
        userId: studentId,
        title: dto.title,
        message: `From: ${teacher?.name ?? 'Teacher'} | Course: ${course.title}\n\n${dto.message}`,
        type: 'message',
        relatedId: dto.courseId,
      }),
    );
    const saved = await this.notificationRepository.save(notifications);
    await Promise.all(
      dto.studentIds.map(async (studentId) => {
        const count = await this.getUnreadCount(studentId);
        this.notificationRealtimeService.emitUnreadCount(studentId, count);
      }),
    );
    return saved;
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
    const count = await this.getUnreadCount(userId);
    this.notificationRealtimeService.emitUnreadCount(userId, count);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    this.notificationRealtimeService.emitUnreadCount(userId, 0);
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
    const saved = await this.notificationRepository.save(notification);
    const count = await this.getUnreadCount(userId);
    this.notificationRealtimeService.emitUnreadCount(userId, count);
    return saved;
  }
}
