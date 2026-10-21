import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BecomeMentorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  area!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}

export class SetActiveDto {
  @IsBoolean()
  active!: boolean;
}

export class CreateRequestDto {
  @IsString()
  @MaxLength(60)
  mentorId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class RespondDto {
  @IsIn(['aceite', 'recusada'])
  status!: 'aceite' | 'recusada';
}
