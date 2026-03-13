import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Course } from '../course/course.entity';

@Entity()
@Unique(['user', 'course'])
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Course, (course) => course.enrollments, { onDelete: 'CASCADE' })
  course: Course;

  @Column()
  courseId: number;

  @Column({ default: 'enrolled' })
  status: string;

  @Column({ nullable: true, type: 'int' })
  semesterNumber: number | null;

  @Column({ nullable: true })
  grade: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  marks: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalMarks: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  midMarks: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  quizMarks: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  assignmentMarks: number;

  @CreateDateColumn()
  enrolledAt: Date;
}
