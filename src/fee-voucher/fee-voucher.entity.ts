import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Course } from '../course/course.entity';

export type FeeVoucherStatus = 'unpaid' | 'paid';

export interface FeeVoucherLineItem {
  courseId: number;
  courseTitle: string;
  coursePrice: number;
  itemType?: 'course' | 'registration';
}

@Entity('fee_vouchers')
export class FeeVoucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  voucherNumber: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'int', nullable: true })
  semesterNumber: number | null;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  courseId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  courseFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  previousDue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'json', nullable: true })
  lineItems: FeeVoucherLineItem[] | null;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ default: 'unpaid' })
  status: FeeVoucherStatus;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
