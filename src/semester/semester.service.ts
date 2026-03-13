import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemesterConfig } from './semester-config.entity';
import { StudentSemester } from './student-semester.entity';
import { User } from '../auth/user.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { Course } from '../course/course.entity';
import { FeeVoucherService } from '../fee-voucher/fee-voucher.service';

export const MAX_SEMESTERS = 12;
export const NORMAL_SEMESTERS = 8;

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  'D-': 0.7,
  F: 0.0,
};

@Injectable()
export class SemesterService {
  constructor(
    @InjectRepository(SemesterConfig)
    private semesterConfigRepository: Repository<SemesterConfig>,
    @InjectRepository(StudentSemester)
    private studentSemesterRepository: Repository<StudentSemester>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private feeVoucherService: FeeVoucherService,
  ) {}

  private gradeToPoints(grade: string): number | null {
    if (Object.prototype.hasOwnProperty.call(GRADE_POINTS, grade)) {
      return GRADE_POINTS[grade];
    }
    return null;
  }

  private calcGPA(
    entries: { grade: string; creditHours: number }[],
  ): number | null {
    const valid = entries.filter(
      (e) => e.grade && this.gradeToPoints(e.grade) !== null,
    );
    if (valid.length === 0) return null;
    const weightedSum = valid.reduce(
      (acc, e) => acc + this.gradeToPoints(e.grade)! * e.creditHours,
      0,
    );
    const totalCH = valid.reduce((acc, e) => acc + e.creditHours, 0);
    if (totalCH === 0) return null;
    return Math.round((weightedSum / totalCH) * 100) / 100;
  }

  async getAllConfigs(): Promise<SemesterConfig[]> {
    return this.semesterConfigRepository.find({
      order: { semesterNumber: 'ASC' },
    });
  }

  async getSemesterConfig(
    semesterNumber: number,
  ): Promise<SemesterConfig | null> {
    return this.semesterConfigRepository.findOneBy({ semesterNumber });
  }

  async upsertSemesterConfig(
    semesterNumber: number,
    data: { name?: string; minCreditHours?: number; maxCreditHours?: number },
  ): Promise<SemesterConfig> {
    if (semesterNumber < 1 || semesterNumber > MAX_SEMESTERS) {
      throw new BadRequestException(
        `Semester number must be between 1 and ${MAX_SEMESTERS}`,
      );
    }
    if (
      data.minCreditHours !== undefined &&
      data.maxCreditHours !== undefined &&
      data.minCreditHours > data.maxCreditHours
    ) {
      throw new BadRequestException(
        'Minimum credit hours cannot exceed maximum credit hours',
      );
    }
    let config = await this.semesterConfigRepository.findOneBy({
      semesterNumber,
    });
    if (!config) {
      config = this.semesterConfigRepository.create({
        semesterNumber,
        name: `Semester ${semesterNumber}`,
        minCreditHours: 9,
        maxCreditHours: 21,
      });
    }
    if (data.name !== undefined) config.name = data.name;
    if (data.minCreditHours !== undefined)
      config.minCreditHours = data.minCreditHours;
    if (data.maxCreditHours !== undefined)
      config.maxCreditHours = data.maxCreditHours;
    return this.semesterConfigRepository.save(config);
  }

  async getCurrentSemesterCreditHours(
    userId: number,
    semesterNumber: number,
  ): Promise<number> {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId, semesterNumber },
      relations: ['course'],
    });
    return enrollments.reduce(
      (acc, e) => acc + (e.course?.creditHours || 0),
      0,
    );
  }

  async validateEnrollment(userId: number, courseId: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    if (user.currentSemester > MAX_SEMESTERS) {
      throw new BadRequestException(
        `You have reached the maximum semester limit of ${MAX_SEMESTERS} semesters.`,
      );
    }

    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) throw new NotFoundException('Course not found');

    const semesterRecord = await this.studentSemesterRepository.findOneBy({
      userId,
      semesterNumber: user.currentSemester,
    });
    if (semesterRecord?.status === 'active') {
      throw new BadRequestException(
        `Semester ${user.currentSemester} is already registered. You cannot add new courses now.`,
      );
    }

    if (
      course.semesterNumber !== null &&
      course.semesterNumber !== undefined &&
      course.semesterNumber !== user.currentSemester
    ) {
      throw new BadRequestException(
        `This course is designated for Semester ${course.semesterNumber}. Your current semester is ${user.currentSemester}.`,
      );
    }

    const config = await this.getSemesterConfig(user.currentSemester);
    if (config) {
      const currentCH = await this.getCurrentSemesterCreditHours(
        userId,
        user.currentSemester,
      );
      if (currentCH + course.creditHours > config.maxCreditHours) {
        throw new BadRequestException(
          `Adding this course (${course.creditHours} credit hours) would exceed the maximum allowed credit hours (${config.maxCreditHours}) for Semester ${user.currentSemester}. Currently enrolled: ${currentCH} credit hours.`,
        );
      }
    }
  }

  private async ensureCurrentSemesterRecord(
    userId: number,
    semesterNumber: number,
  ): Promise<StudentSemester> {
    let record = await this.studentSemesterRepository.findOneBy({
      userId,
      semesterNumber,
    });
    if (!record) {
      record = await this.studentSemesterRepository.save(
        this.studentSemesterRepository.create({
          userId,
          semesterNumber,
          status: 'pending',
        }),
      );
    }
    return record;
  }

  async markSemesterStartedOnCourseSelection(
    userId: number,
    semesterNumber: number,
  ): Promise<void> {
    await this.ensureCurrentSemesterRecord(userId, semesterNumber);
  }

  async registerCurrentSemester(userId: number): Promise<{
    currentSemester: number;
    currentSemesterCreditHours: number;
    currentSemesterMinCH: number;
    currentSemesterMaxCH: number;
    activated: boolean;
    message: string;
  }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Student not found');
    }

    const config = await this.getSemesterConfig(user.currentSemester);
    const minCH = config?.minCreditHours ?? 9;
    const maxCH = config?.maxCreditHours ?? 21;
    const currentCH = await this.getCurrentSemesterCreditHours(
      userId,
      user.currentSemester,
    );

    if (currentCH <= 0) {
      throw new BadRequestException(
        'Select at least one course before registering the semester.',
      );
    }
    if (currentCH < minCH) {
      throw new BadRequestException(
        `Minimum ${minCH} credit hours are required to register this semester. Currently selected: ${currentCH}.`,
      );
    }
    if (currentCH > maxCH) {
      throw new BadRequestException(
        `Selected credit hours exceed the maximum limit (${maxCH}) for this semester.`,
      );
    }

    const record = await this.ensureCurrentSemesterRecord(userId, user.currentSemester);
    if (record.status === 'active') {
      return {
        currentSemester: user.currentSemester,
        currentSemesterCreditHours: currentCH,
        currentSemesterMinCH: minCH,
        currentSemesterMaxCH: maxCH,
        activated: true,
        message: `Semester ${user.currentSemester} is already registered.`,
      };
    }

    await this.feeVoucherService.generateSemesterVoucherForRegistration(
      userId,
      user.currentSemester,
    );

    record.status = 'active';
    await this.studentSemesterRepository.save(record);

    return {
      currentSemester: user.currentSemester,
      currentSemesterCreditHours: currentCH,
      currentSemesterMinCH: minCH,
      currentSemesterMaxCH: maxCH,
      activated: true,
      message: `Semester ${user.currentSemester} has been registered successfully.`,
    };
  }

  async getStudentAcademicSummary(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Student not found');

    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'ASC' },
    });

    const configs = await this.getAllConfigs();
    const configMap = new Map(configs.map((c) => [c.semesterNumber, c]));

    const records = await this.studentSemesterRepository.find({
      where: { userId },
      order: { semesterNumber: 'ASC' },
    });
    const recordMap = new Map(records.map((r) => [r.semesterNumber, r]));

    const bySemester = new Map<number, typeof enrollments>();
    for (const e of enrollments) {
      const sem = e.semesterNumber ?? 1;
      if (!bySemester.has(sem)) bySemester.set(sem, []);
      bySemester.get(sem)!.push(e);
    }

    const semNumbers = [
      ...new Set([
        ...Array.from(bySemester.keys()),
        ...records.map((r) => r.semesterNumber),
        user.currentSemester,
      ]),
    ].sort((a, b) => a - b);

    let cgpaWeightedSum = 0;
    let cgpaTotalCH = 0;

    const semesters = semNumbers.map((semNum) => {
      const semEnrollments = bySemester.get(semNum) || [];
      const config = configMap.get(semNum);
      const record = recordMap.get(semNum);
      const totalCH = semEnrollments.reduce(
        (acc, e) => acc + (e.course?.creditHours || 0),
        0,
      );
      const gradedEntries = semEnrollments
        .filter(
          (e) =>
            e.grade && e.course && this.gradeToPoints(e.grade) !== null,
        )
        .map((e) => ({
          grade: e.grade!,
          creditHours: e.course!.creditHours,
        }));

      const gpa = this.calcGPA(gradedEntries);

      for (const e of gradedEntries) {
        cgpaWeightedSum += this.gradeToPoints(e.grade)! * e.creditHours;
        cgpaTotalCH += e.creditHours;
      }

      const status =
        semNum < user.currentSemester
          ? 'completed'
          : semNum === user.currentSemester
            ? record?.status === 'active'
              ? 'active'
              : 'upcoming'
            : 'upcoming';

      return {
        semesterNumber: semNum,
        name: config?.name ?? `Semester ${semNum}`,
        status,
        gpa,
        enrolledCreditHours: totalCH,
        minCreditHours: config?.minCreditHours ?? 9,
        maxCreditHours: config?.maxCreditHours ?? 21,
        isCurrentSemester: semNum === user.currentSemester,
        startedAt: record?.startedAt ?? null,
        completedAt: record?.completedAt ?? null,
        courses: semEnrollments.map((e) => ({
          courseId: e.courseId,
          courseTitle: e.course?.title ?? 'Unknown',
          creditHours: e.course?.creditHours ?? 0,
          grade: e.grade ?? null,
          gradePoints:
            e.grade ? this.gradeToPoints(e.grade) : null,
          status: e.status,
        })),
      };
    });

    const cgpa =
      cgpaTotalCH > 0
        ? Math.round((cgpaWeightedSum / cgpaTotalCH) * 100) / 100
        : null;

    const config = configMap.get(user.currentSemester);
    const currentSemesterCH = await this.getCurrentSemesterCreditHours(
      userId,
      user.currentSemester,
    );
    const currentSemRecord = recordMap.get(user.currentSemester);
    const currentSemesterActivated = currentSemRecord?.status === 'active';

    return {
      userId,
      studentName: user.name,
      currentSemester: user.currentSemester,
      maxSemesters: MAX_SEMESTERS,
      normalSemesters: NORMAL_SEMESTERS,
      cgpa,
      currentSemesterCreditHours: currentSemesterCH,
      currentSemesterActivated,
      currentSemesterMinCH: config?.minCreditHours ?? 9,
      currentSemesterMaxCH: config?.maxCreditHours ?? 21,
      totalCreditHoursEnrolled: enrollments.reduce(
        (acc, e) => acc + (e.course?.creditHours || 0),
        0,
      ),
      semesters,
    };
  }


  private async performSemesterAdvance(userId: number, semesterNumber: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || user.currentSemester !== semesterNumber) return;
    if (user.currentSemester >= MAX_SEMESTERS) return;

    const record = await this.ensureCurrentSemesterRecord(userId, semesterNumber);

    const semEnrollments = await this.enrollmentRepository.find({
      where: { userId, semesterNumber },
      relations: ['course'],
    });

    const gradedEntries = semEnrollments
      .filter((e) => e.grade && e.course && this.gradeToPoints(e.grade) !== null)
      .map((e) => ({ grade: e.grade!, creditHours: e.course!.creditHours }));

    record.gpa = this.calcGPA(gradedEntries);
    record.status = 'completed';
    record.completedAt = new Date();
    await this.studentSemesterRepository.save(record);

    user.currentSemester += 1;
    await this.userRepository.save(user);

    await this.studentSemesterRepository.save(
      this.studentSemesterRepository.create({
        userId,
        semesterNumber: user.currentSemester,
        status: 'pending',
      }),
    );
  }

  /**
   * Called after every grade assignment. If all courses enrolled in the given
   * semester now have a final grade, automatically records the semester GPA and
   * advances the student to the next semester.
   */
  async checkAndAutoAdvanceSemester(
    userId: number,
    semesterNumber: number | null,
  ): Promise<void> {
    if (semesterNumber === null || semesterNumber === undefined) return;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) return;
    if (user.currentSemester !== semesterNumber) return;
    if (user.currentSemester >= MAX_SEMESTERS) return;

    const semEnrollments = await this.enrollmentRepository.find({
      where: { userId, semesterNumber },
    });

    if (semEnrollments.length === 0) return;

    const allGraded = semEnrollments.every(
      (e) => e.status === 'completed' && e.grade !== null && e.grade !== undefined,
    );
    if (!allGraded) return;

    await this.performSemesterAdvance(userId, semesterNumber);
  }

  async getAllStudentsSemesterSummary() {
    const students = await this.userRepository.find({
      where: { role: 'student' },
      order: { name: 'ASC' },
    });

    const summaries = await Promise.all(
      students.map(async (student) => {
        const enrollments = await this.enrollmentRepository.find({
          where: { userId: student.id },
          relations: ['course'],
        });

        const gradedEntries = enrollments
          .filter(
            (e) => e.grade && e.course && this.gradeToPoints(e.grade) !== null,
          )
          .map((e) => ({
            grade: e.grade!,
            creditHours: e.course!.creditHours,
          }));

        const cgpa = this.calcGPA(gradedEntries);
        const totalCH = enrollments.reduce(
          (acc, e) => acc + (e.course?.creditHours || 0),
          0,
        );
        const currentCH = await this.getCurrentSemesterCreditHours(
          student.id,
          student.currentSemester,
        );
        const config = await this.getSemesterConfig(student.currentSemester);

        return {
          userId: student.id,
          name: student.name,
          email: student.email,
          department: student.department,
          currentSemester: student.currentSemester,
          cgpa,
          totalCreditHoursEnrolled: totalCH,
          currentSemesterCreditHours: currentCH,
          maxCreditHours: config?.maxCreditHours ?? 21,
          minCreditHours: config?.minCreditHours ?? 9,
        };
      }),
    );

    return summaries;
  }
}
