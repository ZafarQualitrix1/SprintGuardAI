import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import {
  AutomationCandidateResult,
  ListAutomationCandidatesBySprintQuery,
} from '../application/queries/list-automation-candidates-by-sprint.query';
import { AutomationCandidateDto } from './dto/automation.dto';
import { toAutomationCandidateDto } from './automation.presenter';

@ApiTags('Automation')
@Controller('sprints/:sprintId/automation-candidates')
export class SprintAutomationController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission('automation:read')
  async list(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AutomationCandidateDto[]> {
    const results = await this.queryBus.execute<ListAutomationCandidatesBySprintQuery, AutomationCandidateResult[]>(
      new ListAutomationCandidatesBySprintQuery(sprintId, user.organizationId),
    );
    return results.map(toAutomationCandidateDto);
  }
}
