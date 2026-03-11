import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceRecordDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsIn(['present', 'absent', 'late'])
  status: string;
}

export class MarkAttendanceDto {
  @IsNumber()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
