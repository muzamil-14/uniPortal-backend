import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Server } from 'socket.io';
import { Quiz } from './quiz.entity';

@Injectable()
export class QuizRealtimeService implements OnModuleInit {
  private server: Server | null = null;
  private expiryTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    @InjectRepository(Quiz)
    private quizRepo: Repository<Quiz>,
  ) {}

  async onModuleInit() {
    const quizzes = await this.quizRepo.find({
      where: { endTime: MoreThan(new Date()) },
      select: ['id', 'endTime'],
    });

    quizzes.forEach((quiz) => this.scheduleQuizExpiry(quiz.id, quiz.endTime));
  }

  registerServer(server: Server) {
    this.server = server;
  }

  broadcastQuizCreated(quiz: Quiz) {
    this.scheduleQuizExpiry(quiz.id, quiz.endTime);
    this.emitCatalogUpdate('created', quiz.id);
  }

  broadcastQuizDeleted(quizId: number) {
    this.clearQuizExpiry(quizId);
    this.emitCatalogUpdate('deleted', quizId);
  }

  private scheduleQuizExpiry(quizId: number, endTime: Date) {
    this.clearQuizExpiry(quizId);

    const delay = new Date(endTime).getTime() - Date.now();
    if (delay <= 0) {
      this.emitCatalogUpdate('expired', quizId);
      return;
    }

    const timer = setTimeout(() => {
      this.expiryTimers.delete(quizId);
      this.emitCatalogUpdate('expired', quizId);
    }, delay);

    this.expiryTimers.set(quizId, timer);
  }

  private clearQuizExpiry(quizId: number) {
    const timer = this.expiryTimers.get(quizId);
    if (timer) {
      clearTimeout(timer);
      this.expiryTimers.delete(quizId);
    }
  }

  private emitCatalogUpdate(reason: 'created' | 'deleted' | 'expired', quizId: number) {
    if (!this.server) {
      return;
    }

    const payload = { reason, quizId, occurredAt: new Date().toISOString() };
    this.server.to('role_student').emit('quizCatalogUpdated', payload);
    this.server.to('role_teacher').emit('quizCatalogUpdated', payload);
  }
}