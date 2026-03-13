import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Enrollment } from '../enrollment/enrollment.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  department: string;

  @Column({ default: 'student' })
  role: string;

  @Column({ default: 1 })
  currentSemester: number;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.user)
  enrollments: Enrollment[];

  @CreateDateColumn()
  createdAt: Date;
}
