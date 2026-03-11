import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['student', 'admin', 'teacher'])
  role: string;
}
