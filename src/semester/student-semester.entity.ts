import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../auth/user.entity';

@Entity('student_semesters')
@Unique(['userId', 'semesterNumber'])
export class StudentSemester {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  semesterNumber: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  gpa: number | null;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;
}
