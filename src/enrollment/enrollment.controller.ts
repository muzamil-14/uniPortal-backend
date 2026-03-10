import {
  Controller,
  Post,
  Get,
  Delete,
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

  @Roles('admin')
  @Get('courses/:courseId/students')
  getCourseStudents(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.enrollmentService.getCourseEnrollments(courseId);
  }

  @Get('courses/:courseId/check')
  async checkEnrollment(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const enrolled = await this.enrollmentService.isEnrolled(
      req.user.userId,
      courseId,
    );
    return { enrolled };
  }

  @Delete('courses/:courseId')
  unenroll(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.enrollmentService.unenroll(req.user.userId, courseId);
  }
}
