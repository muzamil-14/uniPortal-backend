import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './submission.entity';
import { Assignment } from '../assignment/assignment.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { FeeVoucherService } from '../fee-voucher/fee-voucher.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private feeVoucherService: FeeVoucherService,
  ) {}

  async submit(
    studentId: number,
    assignmentId: number,
    file: Express.Multer.File,
  ): Promise<Submission> {
    const assignment = await this.assignmentRepository.findOneBy({ id: assignmentId });
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Check deadline
    if (new Date() > new Date(assignment.deadline)) {
      // Clean up uploaded file
      const filePath = path.join(process.cwd(), 'uploads', file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      throw new BadRequestException('Deadline has passed. Cannot submit.');
    }

    // Check enrollment
    const enrolled = await this.enrollmentRepository.findOneBy({
      userId: studentId,
      courseId: assignment.courseId,
    });
    if (!enrolled) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    await this.feeVoucherService.ensureCourseAccess(studentId, assignment.courseId);

    // Check duplicate submission
    const existing = await this.submissionRepository.findOneBy({
      studentId,
      assignmentId,
    });
    if (existing) {
      throw new ConflictException('You have already submitted this assignment. Submissions cannot be undone.');
    }

    const submission = this.submissionRepository.create({
      assignmentId,
      studentId,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
    });
    return this.submissionRepository.save(submission);
  }

  async getStudentSubmissions(studentId: number): Promise<Submission[]> {
    return this.submissionRepository.find({
      where: { studentId },
      relations: ['assignment', 'assignment.course'],
      order: { submittedAt: 'DESC' },
    });
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<Submission[]> {
    return this.submissionRepository.find({
      where: { assignmentId },
      relations: ['student'],
      order: { submittedAt: 'ASC' },
    });
  }
}
