import { IsString, IsInt, IsArray, IsDateString, ValidateNested, Min, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionDto {
  @IsString()
  questionText: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correctOptionIndex: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  marks?: number;
}

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  courseId: number;

  @IsInt()
  @Min(1)
  duration: number;

  @IsDateString()
  endTime: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class SubmitQuizDto {
  @IsInt()
  quizId: number;

  answers: Record<number, number>;
}
