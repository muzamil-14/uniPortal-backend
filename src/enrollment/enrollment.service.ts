import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { Course } from '../course/course.entity';
import { User } from '../auth/user.entity';
import { StudentSemester } from '../semester/student-semester.entity';
import { NotificationService } from '../notification/notification.service';
import { FeeVoucherService } from '../fee-voucher/fee-voucher.service';
import { SemesterService } from '../semester/semester.service';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(StudentSemester)
    private studentSemesterRepository: Repository<StudentSemester>,
    private notificationService: NotificationService,
    private feeVoucherService: FeeVoucherService,
    private semesterService: SemesterService,
  ) {}

  async enroll(userId: number, courseId: number): Promise<Enrollment> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const student = await this.userRepository.findOneBy({ id: userId });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (course.departments && course.departments.length > 0) {
      if (!course.departments.includes(student.department)) {
        throw new BadRequestException(
          'You can only enroll in courses from your department',
        );
      }
    }

    const userEnrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
    });
    const existing = userEnrollments.find((enrollment) => enrollment.courseId === courseId);
    if (existing) {
      throw new ConflictException('Already enrolled in this course');
    }

    const selectedTitle = this.normalizeCourseTitle(course.title);
    const passedEquivalent = userEnrollments.find(
      (enrollment) =>
        enrollment.courseId !== courseId &&
        this.normalizeCourseTitle(enrollment.course?.title) === selectedTitle &&
        enrollment.status === 'completed' &&
        this.isPassingGrade(enrollment.grade),
    );
    if (passedEquivalent) {
      throw new BadRequestException(
        'You have already passed this course in a previous semester.',
      );
    }

    // Semester validation: check semester restriction and credit hour limits
    await this.semesterService.validateEnrollment(userId, courseId);

    const duplicateByTitle = userEnrollments.find(
      (enrollment) =>
        enrollment.courseId !== courseId &&
        enrollment.semesterNumber === student.currentSemester &&
        this.normalizeCourseTitle(enrollment.course?.title) === selectedTitle,
    );
    if (duplicateByTitle) {
      throw new BadRequestException(
        'You cannot select the same course from multiple teachers in the same semester.',
      );
    }

    const enrollment = this.enrollmentRepository.create({
      userId,
      courseId,
      semesterNumber: student.currentSemester,
    });
    const saved = await this.enrollmentRepository.save(enrollment);
    await this.semesterService.markSemesterStartedOnCourseSelection(
      userId,
      student.currentSemester,
    );
    return saved;
  }

  async getUserEnrollments(userId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async getCourseEnrollments(courseId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user'],
    });
  }

  async unenroll(userId: number, courseId: number): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const dropEligibility = await this.getDropEligibility(enrollment);
    if (!dropEligibility.canDrop) {
      throw new BadRequestException(dropEligibility.message);
    }

    await this.enrollmentRepository.remove(enrollment);
    if (
      enrollment.semesterNumber !== null &&
      enrollment.semesterNumber !== undefined
    ) {
      await this.feeVoucherService.removeCourseFeeOnUnenrollment(
        userId,
        courseId,
        enrollment.semesterNumber,
      );
    }
  }

  async isEnrolled(userId: number, courseId: number): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    return !!enrollment;
  }

  async getEnrollmentStatus(userId: number, courseId: number): Promise<{
    enrolled: boolean;
    canDrop: boolean;
    status: string | null;
    semesterNumber: number | null;
    passedPreviously: boolean;
    message: string | null;
  }> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const userEnrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
    });
    const enrollment = userEnrollments.find((item) => item.courseId === courseId) ?? null;
    const normalizedTitle = this.normalizeCourseTitle(course.title);
    const passedEquivalent = userEnrollments.find(
      (item) =>
        item.courseId !== courseId &&
        this.normalizeCourseTitle(item.course?.title) === normalizedTitle &&
        item.status === 'completed' &&
        this.isPassingGrade(item.grade),
    );

    if (!enrollment) {
      return {
        enrolled: false,
        canDrop: false,
        status: null,
        semesterNumber: null,
        passedPreviously: !!passedEquivalent,
        message: passedEquivalent
          ? 'You already passed this course in a previous semester.'
          : null,
      };
    }

    const dropEligibility = await this.getDropEligibility(enrollment);
    return {
      enrolled: true,
      canDrop: dropEligibility.canDrop,
      status: enrollment.status,
      semesterNumber: enrollment.semesterNumber ?? null,
      passedPreviously:
        !!passedEquivalent ||
        (enrollment.status === 'completed' && this.isPassingGrade(enrollment.grade)),
      message: dropEligibility.message,
    };
  }

  async assignGrade(
    userId: number,
    courseId: number,
    grade: string,
    marks?: number,
    finalMarks?: number,
    midMarks?: number,
    quizMarks?: number,
    assignmentMarks?: number,
  ): Promise<Enrollment> {
    const student = await this.userRepository.findOneBy({ id: userId });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.semesterNumber !== student.currentSemester) {
      throw new ForbiddenException(
        'Grades can only be assigned for active semester enrollments.',
      );
    }

    await this.feeVoucherService.ensureSemesterChallanPaid(
      userId,
      student.currentSemester,
    );

    enrollment.grade = grade;
    enrollment.status = 'completed';

    const hasWeighted =
      finalMarks !== undefined ||
      midMarks !== undefined ||
      quizMarks !== undefined ||
      assignmentMarks !== undefined;

    if (hasWeighted) {
      if (finalMarks !== undefined) enrollment.finalMarks = finalMarks;
      if (midMarks !== undefined) enrollment.midMarks = midMarks;
      if (quizMarks !== undefined) enrollment.quizMarks = quizMarks;
      if (assignmentMarks !== undefined) enrollment.assignmentMarks = assignmentMarks;
      const fm = enrollment.finalMarks ?? 0;
      const mm = enrollment.midMarks ?? 0;
      const qm = enrollment.quizMarks ?? 0;
      const am = enrollment.assignmentMarks ?? 0;
      enrollment.marks =
        Math.round((0.5 * fm + 0.25 * mm + 0.15 * qm + 0.1 * am) * 100) / 100;
    } else if (marks !== undefined) {
      enrollment.marks = marks;
    }

    const saved = await this.enrollmentRepository.save(enrollment);

    // Send grade notification
    const course = await this.courseRepository.findOneBy({ id: courseId });
    await this.notificationService.createNotification(
      userId,
      'Grade Published',
      `Your grade for ${course?.title || 'a course'} has been posted: ${grade}${enrollment.marks !== undefined ? ` (${enrollment.marks} marks)` : ''}`,
      'grade',
      courseId,
    );

    // Trigger automatic semester advancement if all courses in the semester are now graded
    await this.semesterService.checkAndAutoAdvanceSemester(userId, saved.semesterNumber);

    return saved;
  }

  async assignGradeAsTeacher(
    teacherId: number,
    userId: number,
    courseId: number,
    grade: string,
    marks?: number,
    finalMarks?: number,
    midMarks?: number,
    quizMarks?: number,
    assignmentMarks?: number,
  ): Promise<Enrollment> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course || course.instructorId !== teacherId) {
      throw new ForbiddenException(
        'You can only assign grades for courses you teach',
      );
    }

    const enrollment = await this.enrollmentRepository.findOneBy({
      userId,
      courseId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const student = await this.userRepository.findOneBy({ id: userId });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (enrollment.semesterNumber !== student.currentSemester) {
      throw new ForbiddenException(
        'Grades can only be assigned for active semester enrollments.',
      );
    }

    await this.feeVoucherService.ensureSemesterChallanPaid(
      userId,
      student.currentSemester,
    );

    return this.assignGrade(userId, courseId, grade, marks, finalMarks, midMarks, quizMarks, assignmentMarks);
  }

  async getStudentGrades(userId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async getAllEnrollmentsWithGrades(courseId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user', 'course'],
      order: { enrolledAt: 'ASC' },
    });
  }

  async getTeacherCourseEnrollments(
    teacherId: number,
    courseId: number,
  ): Promise<Enrollment[]> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course || course.instructorId !== teacherId) {
      throw new ForbiddenException(
        'You can only view students for courses you teach',
      );
    }
    const enrollments = await this.getAllEnrollmentsWithGrades(courseId);
    const filtered = await Promise.all(
      enrollments.map(async (enrollment) => {
        const semNo = enrollment.semesterNumber ?? 1;
        const student = await this.userRepository.findOneBy({ id: enrollment.userId });
        if (!student || student.currentSemester !== semNo) {
          return null;
        }
        try {
          await this.feeVoucherService.ensureSemesterChallanPaid(
            enrollment.userId,
            semNo,
          );
          return enrollment;
        } catch {
          return null;
        }
      }),
    );
    return filtered.filter((item): item is Enrollment => item !== null);
  }

  async getResultCard(userId: number) {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId, status: 'completed' },
      relations: ['course'],
      order: { enrolledAt: 'ASC' },
    });

    if (enrollments.length === 0) {
      return { courses: [], totalCredits: 0, gpa: 0 };
    }

    const gradePoints: Record<string, number> = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0,
    };

    let totalPoints = 0;
    let totalCredits = 0;

    const courses = enrollments.map((e) => {
      const credits = e.course.creditHours;
      const gp = gradePoints[e.grade] ?? 0;
      totalPoints += gp * credits;
      totalCredits += credits;
      return {
        courseId: e.courseId,
        courseTitle: e.course.title,
        instructor: e.course.instructor,
        creditHours: credits,
        grade: e.grade,
        marks: e.marks,
        finalMarks: e.finalMarks,
        midMarks: e.midMarks,
        quizMarks: e.quizMarks,
        assignmentMarks: e.assignmentMarks,
        gradePoints: gp,
      };
    });

    return {
      courses,
      totalCredits,
      gpa: totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0,
    };
  }

  private normalizeCourseTitle(title: string | null | undefined): string {
    return (title || '').trim().toLowerCase();
  }

  private isPassingGrade(grade: string | null | undefined): boolean {
    return !!grade && grade.trim().toUpperCase() !== 'F';
  }

  private async getDropEligibility(enrollment: Enrollment): Promise<{
    canDrop: boolean;
    message: string | null;
  }> {
    if (enrollment.status === 'completed') {
      return {
        canDrop: false,
        message: 'Cannot drop a completed course. The grade has been finalized.',
      };
    }

    if (this.isPassingGrade(enrollment.grade)) {
      return {
        canDrop: false,
        message: 'Cannot drop a course that has already been passed.',
      };
    }

    if (
      enrollment.semesterNumber !== null &&
      enrollment.semesterNumber !== undefined
    ) {
      const semesterRecord = await this.studentSemesterRepository.findOneBy({
        userId: enrollment.userId,
        semesterNumber: enrollment.semesterNumber,
      });
      if (semesterRecord && semesterRecord.status !== 'pending') {
        return {
          canDrop: false,
          message: `Semester ${enrollment.semesterNumber} is already registered. Courses cannot be dropped now.`,
        };
      }
    }

    return { canDrop: true, message: null };
  }
}
