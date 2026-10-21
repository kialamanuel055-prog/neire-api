import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { SkillLevel } from '@prisma/client';

export class CreateSkillRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  skill!: string;

  @IsString()
  @MaxLength(60)
  evidenceType!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(3000)
  evidence!: string;
}

export class DecideSkillRequestDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsIn(['declarada', 'comprovada', 'validada'])
  level?: SkillLevel;
}
