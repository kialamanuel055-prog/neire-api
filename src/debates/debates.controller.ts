import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateContestDto, CreateDebateTeamDto, ResultDto } from './dto/debate.dto';
import { DebatesService } from './debates.service';

@Controller('debates')
export class DebatesController {
  constructor(private readonly debates: DebatesService) {}

  @Get()
  list() {
    return this.debates.listContests();
  }

  @Roles('admin')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContestDto) {
    return this.debates.createContest(user, dto);
  }

  @Roles('admin')
  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debates.start(user, id);
  }

  @Roles('admin')
  @Post(':id/draw')
  draw(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debates.draw(user, id);
  }

  @Roles('admin')
  @Post(':id/finish')
  finish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debates.finish(user, id);
  }
}

@Controller('debate-teams')
export class DebateTeamsController {
  constructor(private readonly debates: DebatesService) {}

  @Get()
  list() {
    return this.debates.listTeams();
  }

  @Roles('student', 'alumni')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDebateTeamDto) {
    return this.debates.createTeam(user, dto);
  }

  @Roles('student', 'alumni')
  @Post(':id/join')
  join(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debates.joinTeam(user, id);
  }

  @Roles('student', 'alumni')
  @Post(':id/leave')
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debates.leaveTeam(user, id);
  }
}

@Controller('debate-matches')
export class DebateMatchesController {
  constructor(private readonly debates: DebatesService) {}

  @Get()
  list() {
    return this.debates.listMatches();
  }

  @Roles('admin')
  @Patch(':id/result')
  result(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResultDto) {
    return this.debates.setResult(user, id, dto);
  }
}
