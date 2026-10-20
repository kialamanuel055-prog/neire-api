import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsIn(['student', 'company'])
  role!: 'student' | 'company';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  course?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  year?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
