import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseMaterial } from './course-material.entity';
import { CourseMaterialService } from './course-material.service';
import { CourseMaterialController } from './course-material.controller';
import { Course } from '../course/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseMaterial, Course])],
  controllers: [CourseMaterialController],
  providers: [CourseMaterialService],
})
export class CourseMaterialModule {}
