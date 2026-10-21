import { IsString, MaxLength, MinLength } from 'class-validator';

export class IssueCertificateDto {
  @IsString()
  studentId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  activity!: string;
}
