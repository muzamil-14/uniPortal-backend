import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SemesterService } from './semester.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('semesters')
export class SemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Get('my')
  getMyAcademicSummary(@Request() req: any) {
    return this.semesterService.getStudentAcademicSummary(req.user.userId);
  }

  @Roles('student')
  @Post('my/register')
  registerMyCurrentSemester(@Request() req: any) {
    return this.semesterService.registerCurrentSemester(req.user.userId);
  }

  @Roles('admin')
  @Get('configs')
  getAllConfigs() {
    return this.semesterService.getAllConfigs();
  }

  @Roles('admin')
  @Post('configs/:semesterNumber')
  upsertConfig(
    @Param('semesterNumber', ParseIntPipe) semesterNumber: number,
    @Body()
    body: {
      name?: string;
      minCreditHours?: number;
      maxCreditHours?: number;
    },
  ) {
    return this.semesterService.upsertSemesterConfig(semesterNumber, body);
  }

  @Roles('admin')
  @Get('students')
  getAllStudentsSummary() {
    return this.semesterService.getAllStudentsSemesterSummary();
  }

  @Roles('admin')
  @Get('students/:userId')
  getStudentSummary(@Param('userId', ParseIntPipe) userId: number) {
    return this.semesterService.getStudentAcademicSummary(userId);
  }

}
