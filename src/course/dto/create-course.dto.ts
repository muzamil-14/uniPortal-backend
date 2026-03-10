import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  instructor: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  creditHours?: number;

  @IsOptional()
  @IsString()
  schedule?: string;
}
