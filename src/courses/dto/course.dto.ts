import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { CourseKind } from '@prisma/client';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsIn(['curso', 'workshop', 'bootcamp', 'masterclass'])
  kind!: CourseKind;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instructor?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be a date (YYYY-MM-DD)' })
  startDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  hours!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  capacity!: number;
}

export class SetEnrollmentDto {
  @IsBoolean()
  enrolled!: boolean;
}

export class CompleteCourseDto {
  @IsString()
  userId!: string;
}
