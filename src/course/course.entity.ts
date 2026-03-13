import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enrollment } from '../enrollment/enrollment.entity';
import { User } from '../auth/user.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  instructor: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'instructorId' })
  instructorUser: User;

  @Column({ nullable: true })
  instructorId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ default: 3 })
  creditHours: number;

  @Column({ type: 'int', nullable: true })
  semesterNumber: number | null;

  @Column({ type: 'json', nullable: true })
  departments: string[];

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
