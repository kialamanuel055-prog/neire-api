import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChallengeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  problem!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  requirements!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skills!: string[];

  @IsDateString()
  deadline!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prize?: string;
}

export class SetChallengeStatusDto {
  @IsIn(['ativo', 'rejeitado'])
  status!: 'ativo' | 'rejeitado';
}

export class CreateChallengeTeamDto {
  @IsString()
  @MaxLength(60)
  challengeId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;
}

export class SubmitSolutionDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}

export class ScoreDto {
  @IsNumber()
  @Min(0)
  @Max(10)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
