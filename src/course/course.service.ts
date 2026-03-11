import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './course.entity';
import { User } from '../auth/user.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    if (!createCourseDto.instructor) {
      const teacher = await this.userRepository.findOneBy({ id: createCourseDto.instructorId });
      if (teacher) createCourseDto.instructor = teacher.name;
    }
    const course = this.courseRepository.create(createCourseDto);
    return this.courseRepository.save(course);
  }

  async findAll(department?: string): Promise<Course[]> {
    if (department) {
      return this.courseRepository
        .createQueryBuilder('course')
        .where('JSON_CONTAINS(course.departments, :dept)', {
          dept: JSON.stringify(department),
        })
        .getMany();
    }
    return this.courseRepository.find();
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOneBy({ id });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);
    if (updateCourseDto.instructorId && !updateCourseDto.instructor) {
      const teacher = await this.userRepository.findOneBy({ id: updateCourseDto.instructorId });
      if (teacher) updateCourseDto.instructor = teacher.name;
    }
    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }

  async findByInstructor(instructorId: number): Promise<Course[]> {
    return this.courseRepository.find({ where: { instructorId } });
  }
}
