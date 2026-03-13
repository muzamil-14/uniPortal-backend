import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('semester_configs')
export class SemesterConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  semesterNumber: number;

  @Column({ default: '' })
  name: string;

  @Column({ default: 9 })
  minCreditHours: number;

  @Column({ default: 21 })
  maxCreditHours: number;
}
