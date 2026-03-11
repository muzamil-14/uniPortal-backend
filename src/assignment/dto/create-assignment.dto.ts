import { IsNotEmpty, IsString, IsInt, IsDateString } from 'class-validator';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsInt()
  courseId: number;

  @IsNotEmpty()
  @IsDateString()
  deadline: string;
}
