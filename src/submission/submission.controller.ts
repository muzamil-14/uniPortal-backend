import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SubmissionService } from './submission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const storage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'sub-' + uniqueSuffix + extname(file.originalname));
  },
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Roles('student')
  @Post(':assignmentId')
  @UseInterceptors(FileInterceptor('file', { storage }))
  submit(
    @Request() req: any,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.submissionService.submit(req.user.userId, assignmentId, file);
  }

  @Roles('student')
  @Get('my')
  getMySubmissions(@Request() req: any) {
    return this.submissionService.getStudentSubmissions(req.user.userId);
  }

  @Roles('teacher')
  @Get('assignment/:assignmentId')
  getAssignmentSubmissions(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.submissionService.getAssignmentSubmissions(assignmentId);
  }
}
