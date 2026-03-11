import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseMaterial } from './course-material.entity';
import { Course } from '../course/course.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CourseMaterialService {
  constructor(
    @InjectRepository(CourseMaterial)
    private materialRepository: Repository<CourseMaterial>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async upload(
    teacherId: number,
    courseId: number,
    title: string,
    description: string | undefined,
    file: Express.Multer.File,
  ): Promise<CourseMaterial> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== teacherId) {
      throw new ForbiddenException('You can only upload materials for your courses');
    }

    const material = this.materialRepository.create({
      title,
      description,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      fileType: file.mimetype,
      courseId,
      uploadedById: teacherId,
    });
    return this.materialRepository.save(material);
  }

  async findByCourse(courseId: number): Promise<CourseMaterial[]> {
    return this.materialRepository.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
      relations: ['uploadedBy'],
    });
  }

  async delete(materialId: number, teacherId: number): Promise<void> {
    const material = await this.materialRepository.findOneBy({ id: materialId });
    if (!material) throw new NotFoundException('Material not found');
    if (material.uploadedById !== teacherId) {
      throw new ForbiddenException('You can only delete your own materials');
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.materialRepository.remove(material);
  }
}
