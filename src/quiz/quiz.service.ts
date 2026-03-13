import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz, QuizQuestion, QuizAttempt } from './quiz.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { CreateQuizDto } from './dto/quiz.dto';
import { QuizRealtimeService } from './quiz-realtime.service';
import { FeeVoucherService } from '../fee-voucher/fee-voucher.service';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ONE_MINUTE_IN_MS = 60 * 1000;

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepo: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizAttempt)
    private attemptRepo: Repository<QuizAttempt>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    private quizRealtimeService: QuizRealtimeService,
    private feeVoucherService: FeeVoucherService,
  ) {}

  async createQuiz(teacherId: number, dto: CreateQuizDto): Promise<Quiz> {
    const now = new Date();
    const endTime = new Date(dto.endTime);
    if (Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('End time is invalid');
    }
    if (endTime <= now) {
      throw new BadRequestException('End time must be later than the current time');
    }

    for (const q of dto.questions) {
      if (q.correctOptionIndex >= q.options.length) {
        throw new BadRequestException(
          `Correct option index out of range for question: "${q.questionText}"`,
        );
      }
    }

    const quiz = this.quizRepo.create({
      title: dto.title,
      description: dto.description,
      courseId: dto.courseId,
      teacherId,
      duration: dto.duration,
      startTime: now,
      endTime,
      questions: dto.questions.map((q, i) => ({
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        marks: q.marks || 1,
        sortOrder: i,
      })),
    });

    const savedQuiz = await this.quizRepo.save(quiz);
    this.quizRealtimeService.broadcastQuizCreated(savedQuiz);
    return savedQuiz;
  }

  async getTeacherQuizzes(teacherId: number): Promise<Quiz[]> {
    return this.quizRepo.find({
      where: { teacherId },
      relations: ['course', 'questions'],
      order: { createdAt: 'DESC' },
    });
  }

  async getQuizWithAttempts(quizId: number, teacherId: number) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId, teacherId },
      relations: ['questions', 'attempts', 'attempts.student', 'course'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async deleteQuiz(quizId: number, teacherId: number): Promise<void> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId, teacherId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.quizRepo.remove(quiz);
    this.quizRealtimeService.broadcastQuizDeleted(quizId);
  }

  async getStudentQuizzes(studentId: number) {
    const enrollments = await this.enrollmentRepo.find({
      where: { userId: studentId, status: 'enrolled' },
    });
    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const blockedCourseIds = await this.feeVoucherService.getBlockedCourseIds(
      studentId,
      courseIds,
    );
    const accessibleCourseIds = courseIds.filter((id) => !blockedCourseIds.includes(id));
    if (accessibleCourseIds.length === 0) return [];

    const now = new Date();
    const quizzes = await this.quizRepo
      .createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.course', 'course')
      .leftJoin('quiz.attempts', 'attempt', 'attempt.studentId = :studentId', {
        studentId,
      })
      .addSelect([
        'attempt.id',
        'attempt.submitted',
        'attempt.score',
        'attempt.totalMarks',
        'attempt.flaggedCheating',
        'attempt.tabSwitchCount',
        'attempt.startedAt',
      ])
      .where('quiz.courseId IN (:...courseIds)', { courseIds: accessibleCourseIds })
      .andWhere('quiz.isActive = :active', { active: true })
      .andWhere(
        '(quiz.endTime >= :now OR (attempt.id IS NOT NULL AND attempt.submitted = :submitted))',
        { now, submitted: false },
      )
      .orderBy('quiz.createdAt', 'DESC')
      .getMany();

    return quizzes;
  }

  async startAttempt(quizId: number, studentId: number): Promise<QuizAttempt> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['questions'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.feeVoucherService.ensureCourseAccess(studentId, quiz.courseId);

    const enrollment = await this.enrollmentRepo.findOne({
      where: { userId: studentId, courseId: quiz.courseId, status: 'enrolled' },
    });
    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this course or your result has been announced',
      );
    }

    const existing = await this.attemptRepo.findOne({
      where: { quizId, studentId },
    });
    if (existing) {
      if (existing.submitted) {
        throw new BadRequestException('You have already submitted this quiz');
      }

      if (this.isAttemptExpired(existing, quiz.duration)) {
        return this.submitQuiz(existing.id, studentId, existing.answers || {});
      }

      return existing;
    }

    const now = new Date();
    if (now > quiz.endTime) {
      throw new BadRequestException('Quiz is no longer available');
    }

    const attempt = this.attemptRepo.create({
      quizId,
      studentId,
      answers: {},
      score: 0,
      totalMarks: quiz.questions.reduce((sum, q) => sum + q.marks, 0),
      startedAt: now,
    });
    return this.attemptRepo.save(attempt);
  }

  async getQuizForStudent(quizId: number, studentId: number) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['questions', 'course'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.feeVoucherService.ensureCourseAccess(studentId, quiz.courseId);

    const enrollment = await this.enrollmentRepo.findOne({
      where: { userId: studentId, courseId: quiz.courseId, status: 'enrolled' },
    });
    if (!enrollment) {
      throw new ForbiddenException('Not enrolled or course completed');
    }

    const attempt = await this.attemptRepo.findOne({
      where: { quizId, studentId },
    });

    if (!attempt && new Date() > quiz.endTime) {
      throw new BadRequestException('Quiz is no longer available');
    }

    const questions = quiz.questions
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
      }));

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      duration: quiz.duration,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      courseName: quiz.course.title,
      attemptStartedAt: attempt?.startedAt ?? null,
      questions,
    };
  }

  async saveAnswer(
    attemptId: number,
    studentId: number,
    questionId: number,
    optionIndex: number,
  ): Promise<QuizAttempt> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    await this.feeVoucherService.ensureCourseAccess(studentId, attempt.quiz.courseId);
    if (attempt.submitted) {
      throw new BadRequestException('Quiz already submitted');
    }
    if (this.isAttemptExpired(attempt, attempt.quiz.duration)) {
      await this.submitQuiz(attempt.id, studentId, attempt.answers || {});
      throw new BadRequestException('Quiz duration has expired and your attempt was submitted automatically');
    }

    const answers = attempt.answers || {};
    answers[questionId] = optionIndex;
    attempt.answers = answers;
    return this.attemptRepo.save(attempt);
  }

  async reportPhoneDetected(
    attemptId: number,
    studentId: number,
  ): Promise<void> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz'],
    });
    if (!attempt || attempt.submitted) return;
    await this.feeVoucherService.ensureCourseAccess(studentId, attempt.quiz.courseId);
    attempt.flaggedCheating = true;
    await this.attemptRepo.save(attempt);
  }

  async saveScreenshot(
    attemptId: number,
    studentId: number,
    imageData: string,
  ): Promise<void> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz'],
    });
    if (!attempt) return;
    await this.feeVoucherService.ensureCourseAccess(studentId, attempt.quiz.courseId);
    const match = imageData.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!match) return;
    const dir = join(process.cwd(), 'uploads', 'screenshots');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const filename = `attempt_${attemptId}_${Date.now()}.jpg`;
    writeFileSync(join(dir, filename), Buffer.from(match[2], 'base64'));
    attempt.screenshotPath = `uploads/screenshots/${filename}`;
    await this.attemptRepo.save(attempt);
  }

  async saveRecording(
    attemptId: number,
    studentId: number,
    filePath: string,
  ): Promise<void> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz'],
    });
    if (!attempt) return;
    await this.feeVoucherService.ensureCourseAccess(studentId, attempt.quiz.courseId);

    await this.attemptRepo.update(
      { id: attemptId, studentId },
      { recordingPath: filePath },
    );
  }

  async reportTabSwitch(
    attemptId: number,
    studentId: number,
  ): Promise<QuizAttempt> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.submitted) return attempt;
    if (this.isAttemptExpired(attempt, attempt.quiz.duration)) {
      return this.submitQuiz(attempt.id, studentId, attempt.answers || {});
    }

    attempt.tabSwitchCount += 1;
    if (attempt.tabSwitchCount >= 3) {
      attempt.flaggedCheating = true;
    }
    return this.attemptRepo.save(attempt);
  }

  async submitQuiz(
    attemptId: number,
    studentId: number,
    answers: Record<number, number>,
  ): Promise<QuizAttempt> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz', 'quiz.questions'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    await this.feeVoucherService.ensureCourseAccess(studentId, attempt.quiz.courseId);
    if (attempt.submitted) {
      throw new BadRequestException('Quiz already submitted');
    }

    attempt.answers = { ...attempt.answers, ...answers };

    let score = 0;
    const totalMarks = attempt.quiz.questions.reduce(
      (sum, q) => sum + q.marks,
      0,
    );
    for (const q of attempt.quiz.questions) {
      if (attempt.answers[q.id] === q.correctOptionIndex) {
        score += q.marks;
      }
    }

    attempt.score = score;
    attempt.totalMarks = totalMarks;
    attempt.submitted = true;
    attempt.submittedAt = new Date();

    return this.attemptRepo.save(attempt);
  }

  async getAttempt(attemptId: number, studentId: number) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    await this.feeVoucherService.ensureCourseAccess(studentId, attempt.quiz.courseId);

    if (!attempt.submitted && this.isAttemptExpired(attempt, attempt.quiz.duration)) {
      return this.submitQuiz(attempt.id, studentId, attempt.answers || {});
    }

    return attempt;
  }

  private isAttemptExpired(attempt: Pick<QuizAttempt, 'startedAt'>, duration: number) {
    if (!attempt.startedAt) {
      return false;
    }

    const expiresAt = new Date(attempt.startedAt).getTime() + duration * ONE_MINUTE_IN_MS;
    return Date.now() >= expiresAt;
  }
}
