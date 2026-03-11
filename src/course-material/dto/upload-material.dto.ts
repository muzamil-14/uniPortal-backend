import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class UploadMaterialDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsInt()
  courseId: number;
}
