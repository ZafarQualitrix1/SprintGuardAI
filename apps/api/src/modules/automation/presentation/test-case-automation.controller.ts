import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GenerateAutomationCommand } from '../application/commands/generate-automation.command';
import { ListAutomationByTestCaseQuery } from '../application/queries/list-automation-by-test-case.query';
import { AutomationGenerationEntity } from '../domain/entities/automation-generation.entity';
import { GenerateAutomationDto } from './dto/generate-automation.dto';
import { AutomationGenerationDto } from './dto/automation.dto';
import { toAutomationGenerationDto } from './automation.presenter';

@ApiTags('Automation')
@Controller('test-cases/:testCaseId/automation')
export class TestCaseAutomationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('automation:read')
  async list(@Param('testCaseId') testCaseId: string): Promise<AutomationGenerationDto[]> {
    const generations = await this.queryBus.execute<ListAutomationByTestCaseQuery, AutomationGenerationEntity[]>(
      new ListAutomationByTestCaseQuery(testCaseId),
    );
    return generations.map(toAutomationGenerationDto);
  }

  // Also backs "Regenerate Automation" -- same operation, always adds a new version.
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('automation:write')
  async generate(
    @Param('testCaseId') testCaseId: string,
    @Body() dto: GenerateAutomationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AutomationGenerationDto> {
    const generation = await this.commandBus.execute<GenerateAutomationCommand, AutomationGenerationEntity>(
      new GenerateAutomationCommand(user.organizationId, testCaseId, dto.automationType, user.userId),
    );
    return toAutomationGenerationDto(generation);
  }
}
