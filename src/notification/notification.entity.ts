import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column()
  type: string; // 'grade' | 'deadline' | 'announcement' | 'message'

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  relatedId: number;

  @CreateDateColumn()
  createdAt: Date;
}
