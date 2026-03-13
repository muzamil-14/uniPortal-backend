import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  FeeVoucher,
  FeeVoucherLineItem,
  FeeVoucherStatus,
} from './fee-voucher.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { Course } from '../course/course.entity';
import { User } from '../auth/user.entity';

const SEMESTER_REGISTRATION_FEE = 10000;

@Injectable()
export class FeeVoucherService {
  constructor(
    @InjectRepository(FeeVoucher)
    private feeVoucherRepository: Repository<FeeVoucher>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async generateForCourse(courseId: number, dueDate?: string): Promise<FeeVoucher[]> {
    void courseId;
    void dueDate;
    throw new BadRequestException(
      'Fee vouchers are created only when a student registers a semester.',
    );
  }

  async generateSemesterVoucherForRegistration(
    userId: number,
    semesterNumber: number,
    dueDateOverride?: Date,
  ): Promise<FeeVoucher> {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId, semesterNumber },
      relations: ['course'],
      order: { enrolledAt: 'ASC' },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException(
        'Select at least one course before generating a semester challan.',
      );
    }

    const lineItems: FeeVoucherLineItem[] = [
      this.createRegistrationItem(semesterNumber),
      ...enrollments.map((enrollment) =>
        this.createLineItem(
          enrollment.courseId,
          enrollment.course?.title || 'Course',
          enrollment.course?.price ?? 0,
        ),
      ),
    ];

    const dueDate = dueDateOverride || this.defaultDueDate();
    const latestCourseItem = [...lineItems]
      .reverse()
      .find((item) => item.itemType !== 'registration');
    const totalAmount = this.sumLineItems(lineItems);

    const voucher = await this.getVoucherForUserSemester(userId, semesterNumber);
    if (!voucher) {
      return this.createNewVoucher(
        userId,
        semesterNumber,
        latestCourseItem?.courseId ?? 0,
        lineItems,
        dueDate,
      );
    }

    if (voucher.status === 'paid') {
      return voucher;
    }

    voucher.dueDate = voucher.dueDate || dueDate;
    voucher.lineItems = lineItems;
    voucher.courseId = latestCourseItem?.courseId ?? voucher.courseId;
    voucher.courseFee = this.asNumber(latestCourseItem?.coursePrice);
    voucher.totalAmount = totalAmount;
    voucher.previousDue = Math.max(
      0,
      this.round2(totalAmount - voucher.courseFee),
    );
    voucher.status = 'unpaid';
    voucher.paidAt = null;

    return this.feeVoucherRepository.save(voucher);
  }

  async addCourseFeeOnEnrollment(
    userId: number,
    courseId: number,
    semesterNumber: number,
    dueDateOverride?: Date,
  ): Promise<FeeVoucher> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const courseFee = this.asNumber(course.price);
    const dueDate = dueDateOverride || this.defaultDueDate();
    const lineItem = this.createLineItem(courseId, course.title, course.price);
    const registrationItem = this.createRegistrationItem(semesterNumber);

    const voucher = await this.getVoucherForUserSemester(userId, semesterNumber);
    if (!voucher) {
      return this.createNewVoucher(userId, semesterNumber, courseId, [registrationItem, lineItem], dueDate);
    }

    if (voucher.status === 'paid') {
      throw new BadRequestException(
        'Semester challan is already paid. New courses cannot be added to this semester challan.',
      );
    }

    if (!voucher.dueDate) {
      voucher.dueDate = dueDate;
    }
    voucher.lineItems = this.ensureLineItem(voucher.lineItems, registrationItem);
    voucher.lineItems = this.ensureLineItem(voucher.lineItems, lineItem);

    voucher.courseId = courseId;
    voucher.courseFee = courseFee;
    voucher.totalAmount = this.sumLineItems(voucher.lineItems);
    voucher.previousDue = Math.max(0, this.round2(voucher.totalAmount - courseFee));
    voucher.status = 'unpaid';
    voucher.paidAt = null;
    return this.feeVoucherRepository.save(voucher);
  }

  async removeCourseFeeOnUnenrollment(
    userId: number,
    courseId: number,
    semesterNumber: number,
  ): Promise<FeeVoucher | null> {
    const voucher = await this.getVoucherForUserSemester(userId, semesterNumber);
    if (!voucher) {
      return null;
    }

    if (voucher.status === 'paid') {
      throw new BadRequestException(
        'Semester challan is already paid. Registered courses cannot be removed now.',
      );
    }

    const lineItems = (Array.isArray(voucher.lineItems) ? voucher.lineItems : []).filter(
      (item) => item.courseId !== courseId,
    );
    voucher.lineItems = lineItems;

    const latestCourseItem = [...lineItems]
      .reverse()
      .find((item) => item.itemType !== 'registration');
    const recalculatedTotal = this.sumLineItems(voucher.lineItems);
    voucher.courseId = latestCourseItem?.courseId ?? voucher.courseId;
    voucher.courseFee = this.asNumber(latestCourseItem?.coursePrice);
    voucher.totalAmount = recalculatedTotal;
    voucher.previousDue = Math.max(
      0,
      this.round2(recalculatedTotal - voucher.courseFee),
    );
    voucher.status = 'unpaid';
    voucher.paidAt = null;

    return this.feeVoucherRepository.save(voucher);
  }

  async getCourseVouchersForAdmin(courseId: number): Promise<FeeVoucher[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId, status: In(['enrolled', 'completed']) },
      select: ['userId'],
    });
    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    if (userIds.length === 0) {
      return [];
    }

    const vouchers = await this.feeVoucherRepository.find({
      where: { userId: In(userIds) },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
    });

    const latestByUser = new Map<number, FeeVoucher>();
    for (const voucher of vouchers) {
      if (!latestByUser.has(voucher.userId)) {
        latestByUser.set(voucher.userId, voucher);
      }
    }
    return [...latestByUser.values()].map((voucher) => this.normalizeVoucher(voucher));
  }

  async getAllVouchersForAdmin(): Promise<FeeVoucher[]> {
    const vouchers = await this.feeVoucherRepository.find({
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
    });
    return vouchers.map((voucher) => this.normalizeVoucher(voucher));
  }

  async updateStatus(id: number, status: FeeVoucherStatus): Promise<FeeVoucher> {
    const voucher = await this.feeVoucherRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
    if (!voucher) {
      throw new NotFoundException('Fee voucher not found');
    }

    if (voucher.status === 'paid') {
      if (status === 'paid') {
        return this.normalizeVoucher(voucher);
      }
      throw new BadRequestException(
        'Paid voucher cannot be reverted.',
      );
    }

    voucher.status = status;
    voucher.paidAt = status === 'paid' ? new Date() : null;
    return this.feeVoucherRepository.save(voucher);
  }

  async getMyVouchers(userId: number): Promise<FeeVoucher[]> {
    const vouchers = await this.feeVoucherRepository.find({
      where: { userId },
      relations: ['course', 'user'],
      order: { createdAt: 'DESC' },
    });
    return vouchers.map((voucher) => this.normalizeVoucher(voucher));
  }

  async getMyVoucher(userId: number, voucherId: number): Promise<FeeVoucher> {
    const voucher = await this.feeVoucherRepository.findOne({
      where: { id: voucherId },
      relations: ['course', 'user'],
    });
    if (!voucher) {
      throw new NotFoundException('Fee voucher not found');
    }
    if (voucher.userId !== userId) {
      throw new ForbiddenException('You can only download your own voucher');
    }
    return this.normalizeVoucher(voucher);
  }

  async ensureCourseAccess(userId: number, courseId: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Student not found');
    }

    const enrollment = await this.enrollmentRepository.findOneBy({ userId, courseId });
    if (!enrollment) {
      throw new ForbiddenException('Access blocked: you are not enrolled in this course.');
    }

    if (enrollment.semesterNumber !== user.currentSemester) {
      throw new ForbiddenException('Access blocked: only active semester courses are accessible.');
    }

    await this.ensureSemesterChallanPaid(userId, user.currentSemester);
  }

  async getBlockedCourseIds(userId: number, courseIds: number[]): Promise<number[]> {
    if (courseIds.length === 0) {
      return [];
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      return courseIds;
    }

    const semesterVoucher = await this.getVoucherForUserSemester(userId, user.currentSemester);
    if (!semesterVoucher || semesterVoucher.status !== 'paid') {
      return courseIds;
    }
    return [];
  }

  async ensureSemesterChallanPaid(
    userId: number,
    semesterNumber: number,
  ): Promise<FeeVoucher> {
    const voucher = await this.getVoucherForUserSemester(userId, semesterNumber);
    if (!voucher) {
      throw new ForbiddenException(
        `Access blocked: semester ${semesterNumber} challan has not been generated yet. Register the semester first.`,
      );
    }
    if (voucher.status !== 'paid') {
      throw new ForbiddenException(
        `Access blocked: semester ${semesterNumber} challan is unpaid. Please clear dues from admin.`,
      );
    }
    return voucher;
  }

  private async getLatestVoucherForUser(userId: number): Promise<FeeVoucher | null> {
    const voucher = await this.feeVoucherRepository.findOne({
      where: { userId },
      relations: ['course', 'user'],
      order: { createdAt: 'DESC' },
    });
    return voucher ? this.normalizeVoucher(voucher) : null;
  }

  private async getVoucherForUserSemester(
    userId: number,
    semesterNumber: number,
  ): Promise<FeeVoucher | null> {
    const voucher = await this.feeVoucherRepository.findOne({
      where: { userId, semesterNumber },
      relations: ['course', 'user'],
      order: { createdAt: 'DESC' },
    });
    return voucher ? this.normalizeVoucher(voucher) : null;
  }

  private async createNewVoucher(
    userId: number,
    semesterNumber: number,
    courseId: number,
    lineItems: FeeVoucherLineItem[],
    dueDate: Date,
  ): Promise<FeeVoucher> {
    const created = this.feeVoucherRepository.create({
      voucherNumber: this.generateVoucherNumber(userId),
      userId,
      semesterNumber,
      courseId,
      courseFee: this.asNumber(
        lineItems.find((item) => item.itemType !== 'registration')?.coursePrice,
      ),
      previousDue: Math.max(
        0,
        this.round2(
          this.sumLineItems(lineItems) -
            this.asNumber(
              lineItems.find((item) => item.itemType !== 'registration')
                ?.coursePrice,
            ),
        ),
      ),
      totalAmount: this.sumLineItems(lineItems),
      lineItems,
      dueDate,
      status: 'unpaid',
      paidAt: null,
    });
    return this.feeVoucherRepository.save(created);
  }

  private normalizeVoucher(voucher: FeeVoucher): FeeVoucher {
    const lineItems = Array.isArray(voucher.lineItems) ? voucher.lineItems : [];
    voucher.lineItems = lineItems.map((item) => ({
      courseId: item.courseId,
      courseTitle: item.courseTitle,
      coursePrice: this.asNumber(item.coursePrice),
      itemType: item.itemType,
    }));
    voucher.totalAmount = this.sumLineItems(voucher.lineItems);
    return voucher;
  }

  private createRegistrationItem(semesterNumber: number): FeeVoucherLineItem {
    return {
      courseId: 0,
      courseTitle: `Semester ${semesterNumber} Registration Fee`,
      coursePrice: SEMESTER_REGISTRATION_FEE,
      itemType: 'registration',
    };
  }

  private createLineItem(
    courseId: number,
    courseTitle: string,
    coursePrice: number | string,
  ): FeeVoucherLineItem {
    return {
      courseId,
      courseTitle,
      coursePrice: this.asNumber(coursePrice),
      itemType: 'course',
    };
  }

  private ensureLineItem(
    lineItems: FeeVoucherLineItem[] | null,
    nextItem: FeeVoucherLineItem,
  ): FeeVoucherLineItem[] {
    const current = Array.isArray(lineItems) ? [...lineItems] : [];
    const existingIndex = current.findIndex((item) => item.courseId === nextItem.courseId);
    if (existingIndex >= 0) {
      current[existingIndex] = nextItem;
      return current;
    }
    current.push(nextItem);
    return current;
  }

  private sumLineItems(lineItems: FeeVoucherLineItem[] | null): number {
    const items = Array.isArray(lineItems) ? lineItems : [];
    return this.round2(items.reduce((sum, item) => sum + this.asNumber(item.coursePrice), 0));
  }

  private isVoucherSettled(voucher: FeeVoucher): boolean {
    return voucher.paidAt !== null || this.asNumber(voucher.totalAmount) <= 0;
  }

  private generateVoucherNumber(userId: number): string {
    return `FV-${userId}-${Date.now()}`;
  }

  private defaultDueDate(): Date {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    return dueDate;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private asNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value) || 0;
  }
}
