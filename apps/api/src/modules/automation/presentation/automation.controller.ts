import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetAutomationDetailQuery } from '../application/queries/get-automation-detail.query';
import { SaveAutomationCommand } from '../application/commands/save-automation.command';
import { AutomationGenerationEntity } from '../domain/entities/automation-generation.entity';
import { AutomationGenerationDetailDto, AutomationGenerationDto } from './dto/automation.dto';
import { toAutomationGenerationDetailDto, toAutomationGenerationDto } from './automation.presenter';

// Detail includes `files` -- used for both "Preview Code" and client-side "Download Framework"
// (zipped in the browser from these same files, no server-side zip streaming needed).
@ApiTags('Automation')
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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
