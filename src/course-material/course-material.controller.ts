import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CourseMaterialService } from './course-material.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FeeVoucherService } from '../fee-voucher/fee-voucher.service';

const storage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('course-materials')
export class CourseMaterialController {
  constructor(
    private readonly materialService: CourseMaterialService,
    private readonly feeVoucherService: FeeVoucherService,
  ) {}

  @Roles('teacher')
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage }))
  upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description?: string; courseId: string },
  ) {
    return this.materialService.upload(
      req.user.userId,
      parseInt(body.courseId, 10),
      body.title,
      body.description,
      file,
    );
  }

  @Get('course/:courseId')
  async findByCourse(
    @Request() req: any,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    if (req.user.role === 'student') {
      await this.feeVoucherService.ensureCourseAccess(req.user.userId, courseId);
    }
    return this.materialService.findByCourse(courseId);
  }

  @Roles('teacher')
  @Delete(':id')
  delete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.materialService.delete(id, req.user.userId);
  }
}
