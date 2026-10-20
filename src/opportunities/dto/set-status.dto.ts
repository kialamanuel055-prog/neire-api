import { IsIn } from 'class-validator';
import type { OpportunityStatus } from '@prisma/client';

export class SetOpportunityStatusDto {
  @IsIn(['publicada', 'rejeitada', 'encerrada'])
  status!: OpportunityStatus;
}
