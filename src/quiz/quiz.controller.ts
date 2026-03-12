import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/quiz.dto';

@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Post()
  @Roles('teacher')
  createQuiz(@Request() req, @Body() dto: CreateQuizDto) {
    return this.quizService.createQuiz(req.user.userId, dto);
  }

  @Get('teacher')
  @Roles('teacher')
  getTeacherQuizzes(@Request() req) {
    return this.quizService.getTeacherQuizzes(req.user.userId);
  }

  @Get('teacher/:id')
  @Roles('teacher')
  getQuizWithAttempts(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizService.getQuizWithAttempts(id, req.user.userId);
  }

  @Delete('teacher/:id')
  @Roles('teacher')
  deleteQuiz(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.quizService.deleteQuiz(id, req.user.userId);
  }

  @Get('student')
  @Roles('student')
  getStudentQuizzes(@Request() req) {
    return this.quizService.getStudentQuizzes(req.user.userId);
  }

  @Get('student/:id')
  @Roles('student')
  getQuizForStudent(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizService.getQuizForStudent(id, req.user.userId);
  }

  @Post('student/:id/start')
  @Roles('student')
  startAttempt(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.quizService.startAttempt(id, req.user.userId);
  }

  @Post('attempts/:id/submit')
  @Roles('student')
  submitQuiz(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { answers: Record<number, number> },
  ) {
    return this.quizService.submitQuiz(id, req.user.userId, body.answers);
  }

  @Get('attempts/:id')
  @Roles('student')
  getAttempt(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.quizService.getAttempt(id, req.user.userId);
  }

  @Post('attempts/:id/screenshot')
  @Roles('student')
  async saveScreenshot(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { imageData: string },
  ) {
    await this.quizService.saveScreenshot(id, req.user.userId, body.imageData);
    return { ok: true };
  }

  @Post('attempts/:id/recording')
  @Roles('student')
  @UseInterceptors(
    FileInterceptor('recording', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'recordings');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          cb(null, `attempt_${(req.params as any).id}_${Date.now()}.webm`);
        },
      }),
      limits: { fileSize: 200 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('Only video files are allowed'), false);
      },
    }),
  )
  async saveRecording(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) return { ok: false };
    await this.quizService.saveRecording(id, req.user.userId, file.path);
    return { ok: true };
  }
}
