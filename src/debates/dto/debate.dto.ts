import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateContestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  topics!: string[];
}

export class CreateDebateTeamDto {
  @IsString()
  @MaxLength(60)
  contestId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;
}

export class ResultDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  scoreA!: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  scoreB!: number;
}
