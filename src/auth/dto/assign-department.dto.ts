import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDepartmentDto {
  @IsString()
  @IsNotEmpty()
  department: string;
}
