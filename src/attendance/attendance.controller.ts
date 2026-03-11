import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'teacher')
  @Post('mark')
  markAttendance(@Body() dto: MarkAttendanceDto) {
    return this.attendanceService.markAttendance(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'teacher')
  @Get('course/:courseId')
  getCourseAttendance(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getCourseAttendance(courseId, date);
  }

  @Get('my')
  getMyAttendance(@Request() req: any) {
    return this.attendanceService.getStudentAttendance(req.user.userId);
  }

  @Get('my/summary')
  getMyAttendanceSummary(@Request() req: any) {
    return this.attendanceService.getAttendanceSummary(req.user.userId);
  }

  @Get('my/course/:courseId')
  getMyCoursAttendance(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.attendanceService.getStudentCourseAttendance(
      req.user.userId,
      courseId,
    );
  }
}
