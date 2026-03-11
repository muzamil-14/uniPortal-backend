import { IsNotEmpty, IsString, IsInt, IsArray } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsInt()
  courseId: number;

  @IsArray()
  @IsInt({ each: true })
  studentIds: number[];
}
