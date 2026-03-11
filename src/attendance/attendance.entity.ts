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
@Unique(['userId', 'courseId', 'date'])
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  course: Course;

  @Column()
  courseId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 'present' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
