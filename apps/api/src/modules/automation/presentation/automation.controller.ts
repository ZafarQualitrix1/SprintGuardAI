import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetAutomationDetailQuery } from '../application/queries/get-automation-detail.query';
import {
  ApprovedApiAutomationCandidateResult,
  ListApprovedApiAutomationCandidatesQuery,
} from '../application/queries/list-approved-api-automation-candidates.query';
import { SaveAutomationCommand } from '../application/commands/save-automation.command';
import { AutomationGenerationEntity } from '../domain/entities/automation-generation.entity';
import { ApprovedApiAutomationCandidateDto, AutomationGenerationDetailDto, AutomationGenerationDto } from './dto/automation.dto';
import {
  toApprovedApiAutomationCandidateDto,
  toAutomationGenerationDetailDto,
  toAutomationGenerationDto,
} from './automation.presenter';

// Detail includes `files` -- used for both "Preview Code" and client-side "Download Framework"
// (zipped in the browser from these same files, no server-side zip streaming needed).
@ApiTags('Automation')
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // Declared before ':id' -- NestJS/Express matches routes in registration order, so a literal
  // segment after a dynamic ':id' sibling would otherwise never be reached (it'd match :id first).
  @Get('candidates')
  @RequirePermission('automation:read')
  async candidates(
    @Query('projectId') projectId: string | undefined,
    @Query('sprintId') sprintId: string | undefined,
    @Query('storyIds') storyIds: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApprovedApiAutomationCandidateDto[]> {
    const results = await this.queryBus.execute<
      ListApprovedApiAutomationCandidatesQuery,
      ApprovedApiAutomationCandidateResult[]
    >(
      new ListApprovedApiAutomationCandidatesQuery(user.organizationId, {
        projectId: projectId || undefined,
        sprintId: sprintId || undefined,
        storyIds: storyIds ? storyIds.split(',').filter(Boolean) : undefined,
      }),
    );
    return results.map(toApprovedApiAutomationCandidateDto);
  }

  @Get(':id')
  @RequirePermission('automation:read')
  async detail(@Param('id') id: string): Promise<AutomationGenerationDetailDto> {
    const generation = await this.queryBus.execute<GetAutomationDetailQuery, AutomationGenerationEntity>(
      new GetAutomationDetailQuery(id),
    );
    return toAutomationGenerationDetailDto(generation);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('automation:write')
  async save(@Param('id') id: string): Promise<AutomationGenerationDto> {
    const generation = await this.commandBus.execute<SaveAutomationCommand, AutomationGenerationEntity>(
      new SaveAutomationCommand(id),
    );
    return toAutomationGenerationDto(generation);
  }
}
