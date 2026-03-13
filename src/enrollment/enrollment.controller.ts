import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('courses/:courseId')
  enroll(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.enrollmentService.enroll(req.user.userId, courseId);
  }

  @Get('my-courses')
  getMyEnrollments(@Request() req: any) {
    return this.enrollmentService.getUserEnrollments(req.user.userId);
  }

  @Roles('admin', 'teacher')
  @Get('courses/:courseId/students')
  getCourseStudents(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    if (req.user.role === 'teacher') {
      return this.enrollmentService.getTeacherCourseEnrollments(
        req.user.userId,
        courseId,
      );
    }
    return this.enrollmentService.getCourseEnrollments(courseId);
  }

  @Get('courses/:courseId/check')
  async checkEnrollment(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.enrollmentService.getEnrollmentStatus(req.user.userId, courseId);
  }

  @Delete('courses/:courseId')
  unenroll(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.enrollmentService.unenroll(req.user.userId, courseId);
  }

  @Roles('admin', 'teacher')
  @Patch('courses/:courseId/users/:userId/grade')
  assignGrade(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body()
    body: {
      grade: string;
      marks?: number;
      finalMarks?: number;
      midMarks?: number;
      quizMarks?: number;
      assignmentMarks?: number;
    },
  ) {
    if (req.user.role === 'teacher') {
      return this.enrollmentService.assignGradeAsTeacher(
        req.user.userId,
        userId,
        courseId,
        body.grade,
        body.marks,
        body.finalMarks,
        body.midMarks,
        body.quizMarks,
        body.assignmentMarks,
      );
    }
    return this.enrollmentService.assignGrade(
      userId,
      courseId,
      body.grade,
      body.marks,
      body.finalMarks,
      body.midMarks,
      body.quizMarks,
      body.assignmentMarks,
    );
  }

  @Get('my-grades')
  getMyGrades(@Request() req: any) {
    return this.enrollmentService.getStudentGrades(req.user.userId);
  }

  @Get('result-card')
  getResultCard(@Request() req: any) {
    return this.enrollmentService.getResultCard(req.user.userId);
  }

  @Roles('admin', 'teacher')
  @Get('courses/:courseId/grades')
  getCourseGrades(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    if (req.user.role === 'teacher') {
      return this.enrollmentService.getTeacherCourseEnrollments(
        req.user.userId,
        courseId,
      );
    }
    return this.enrollmentService.getAllEnrollmentsWithGrades(courseId);
  }
}
