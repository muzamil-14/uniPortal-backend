import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  instructor?: string;

  @IsNumber()
  @IsNotEmpty()
  instructorId: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  creditHours?: number;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  departments: string[];
}
