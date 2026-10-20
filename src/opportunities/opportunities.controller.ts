import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import type { AuthUser } from '../common/types';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { SetOpportunityStatusDto } from './dto/set-status.dto';
import { OpportunitiesService } from './opportunities.service';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.opportunities.list(user);
  }

  @Roles('company')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOpportunityDto) {
    return this.opportunities.create(user, dto);
  }

  @Roles('company', 'admin')
  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetOpportunityStatusDto) {
    return this.opportunities.setStatus(user, id, dto.status);
  }
}
