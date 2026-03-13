import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FeeVoucherService } from '../fee-voucher/fee-voucher.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
    private readonly feeVoucherService: FeeVoucherService,
  ) {}

  @Roles('teacher')
  @Post()
  create(@Request() req: any, @Body() dto: CreateAssignmentDto) {
    return this.assignmentService.create(req.user.userId, dto);
  }

  @Get('course/:courseId')
  async findByCourse(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    if (req.user.role === 'student') {
      await this.feeVoucherService.ensureCourseAccess(req.user.userId, courseId);
    }
    return this.assignmentService.findByCourse(courseId);
  }

  @Get('my')
  @Roles('teacher')
  getTeacherAssignments(@Request() req: any) {
    return this.assignmentService.getTeacherAssignments(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentService.findOne(id);
  }

  @Roles('teacher')
  @Put(':id')
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentService.update(id, req.user.userId, dto);
  }

  @Roles('teacher')
  @Delete(':id')
  delete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.assignmentService.delete(id, req.user.userId);
  }
}
