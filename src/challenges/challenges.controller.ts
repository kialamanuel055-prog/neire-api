import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import {
  CreateChallengeDto,
  CreateChallengeTeamDto,
  ScoreDto,
  SetChallengeStatusDto,
  SubmitSolutionDto,
} from './dto/challenge.dto';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.challenges.list(user);
  }

  @Roles('company')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChallengeDto) {
    return this.challenges.create(user, dto);
  }

  @Roles('admin')
  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetChallengeStatusDto) {
    return this.challenges.setStatus(user, id, dto);
  }

  @Roles('company', 'admin')
  @Post(':id/winner')
  winner(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.challenges.declareWinner(user, id);
  }
}

@Controller('challenge-teams')
export class ChallengeTeamsController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.challenges.listTeams(user);
  }

  @Roles('student', 'alumni')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChallengeTeamDto) {
    return this.challenges.createTeam(user, dto);
  }

  @Roles('student', 'alumni')
  @Post(':id/join')
  join(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.challenges.joinTeam(user, id);
  }

  @Roles('student', 'alumni')
  @Post(':id/leave')
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.challenges.leaveTeam(user, id);
  }

  @Roles('student', 'alumni')
  @Put(':id/submission')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitSolutionDto) {
    return this.challenges.submit(user, id, dto);
  }
}

@Controller('challenge-submissions')
export class ChallengeSubmissionsController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.challenges.listSubmissions(user);
  }

  @Roles('company', 'admin')
  @Patch(':id/score')
  score(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ScoreDto) {
    return this.challenges.score(user, id, dto);
  }
}
