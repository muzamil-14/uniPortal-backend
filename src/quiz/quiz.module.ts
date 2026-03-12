import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz, QuizQuestion, QuizAttempt } from './quiz.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizGateway } from './quiz.gateway';
import { QuizRealtimeService } from './quiz-realtime.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, QuizQuestion, QuizAttempt, Enrollment]),
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizGateway, QuizRealtimeService],
})
export class QuizModule {}
