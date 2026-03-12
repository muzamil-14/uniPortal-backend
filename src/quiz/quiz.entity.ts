import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Course } from '../course/course.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  course: Course;

  @Column()
  courseId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  teacher: User;

  @Column()
  teacherId: number;

  @Column({ type: 'int', comment: 'Duration in minutes' })
  duration: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => QuizQuestion, (q) => q.quiz, { cascade: true })
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, (a) => a.quiz)
  attempts: QuizAttempt[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Quiz, (q) => q.questions, { onDelete: 'CASCADE' })
  quiz: Quiz;

  @Column()
  quizId: number;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'json' })
  options: string[];

  @Column({ type: 'int', comment: 'Index of correct option (0-based)' })
  correctOptionIndex: number;

  @Column({ type: 'int', default: 1 })
  marks: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Quiz, (q) => q.attempts, { onDelete: 'CASCADE' })
  quiz: Quiz;

  @Column()
  quizId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  student: User;

  @Column()
  studentId: number;

  @Column({ type: 'json', nullable: true })
  answers: Record<number, number>;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  totalMarks: number;

  @Column({ default: false })
  submitted: boolean;

  @Column({ type: 'int', default: 0 })
  tabSwitchCount: number;

  @Column({ default: false })
  flaggedCheating: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  screenshotPath: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  recordingPath: string | null;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
