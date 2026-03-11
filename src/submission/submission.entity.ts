import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Assignment } from '../assignment/assignment.entity';
import { User } from '../auth/user.entity';

@Entity()
@Unique(['student', 'assignment'])
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Assignment, (a) => a.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: Assignment;

  @Column()
  assignmentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  studentId: number;

  @Column()
  fileName: string;

  @Column()
  fileUrl: string;

  @CreateDateColumn()
  submittedAt: Date;
}
