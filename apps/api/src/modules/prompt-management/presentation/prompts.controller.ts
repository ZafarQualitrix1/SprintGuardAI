import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

import { CreatePromptCommand } from '../application/commands/create-prompt.command';
import { CreatePromptVersionCommand } from '../application/commands/create-prompt-version.command';
import { UpdatePromptDraftCommand } from '../application/commands/update-prompt-draft.command';
import { ClonePromptCommand } from '../application/commands/clone-prompt.command';
import {
  SubmitPromptForReviewCommand,
  ApprovePromptCommand,
  RejectPromptCommand,
  ActivatePromptCommand,
  ArchivePromptCommand,
  DeletePromptCommand,
} from '../application/commands/prompt-lifecycle.commands';
import { RunPromptPlaygroundCommand, PromptPlaygroundResult } from '../application/commands/run-prompt-playground.command';

import { ListPromptsQuery } from '../application/queries/list-prompts.query';
import { GetPromptHistoryQuery } from '../application/queries/get-prompt-history.query';
import { GetPromptVersionQuery } from '../application/queries/get-prompt-version.query';
import { ComparePromptVersionsQuery, PromptComparisonResult } from '../application/queries/compare-prompt-versions.query';
import { GetPromptVariablesQuery } from '../application/queries/get-prompt-variables.query';
import { ListPromptExecutionsQuery } from '../application/queries/list-prompt-executions.query';
import { GetPromptAnalyticsQuery } from '../application/queries/get-prompt-analytics.query';

import { PromptEntity, PromptLibraryRow } from '../domain/entities/prompt.entity';
import { AnalyticsSummary, ExecutionRow } from '../domain/repositories/prompt-execution-read.repository.interface';
import {
  CreatePromptDto,
  CreatePromptVersionDto,
  UpdatePromptDraftDto,
  ClonePromptDto,
  RejectPromptDto,
  ApprovePromptDto,
  RunPlaygroundDto,
} from './dto/prompt.dto';
import { toPromptLibraryRowResponseDto, toPromptResponseDto } from './dto/prompt-response.dto';
import { toExecutionRowResponseDto } from './dto/execution-response.dto';

const DEFAULT_PAGE_SIZE = 25;

@ApiTags('Prompt Management')
@Controller('prompts')
export class PromptsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('prompt:read')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('createdBy') createdBy?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.queryBus.execute<ListPromptsQuery, { rows: PromptLibraryRow[]; total: number }>(
      new ListPromptsQuery({
        organizationId: user.organizationId,
        search,
        category,
        status: status as never,
        createdBy,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : DEFAULT_PAGE_SIZE,
      }),
    );
    return { rows: result.rows.map(toPromptLibraryRowResponseDto), total: result.total };
  }

  // Executions/Analytics routes are registered before the ':capability' catch-alls below so they
  // aren't swallowed by the dynamic segment.
  @Get('executions')
  @RequirePermission('prompt:read')
  async listExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('capability') capability?: string,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.queryBus.execute<ListPromptExecutionsQuery, { rows: ExecutionRow[]; total: number }>(
      new ListPromptExecutionsQuery({
        organizationId: user.organizationId,
        capability,
        provider,
        model,
        status: status as never,
        search,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : DEFAULT_PAGE_SIZE,
      }),
    );
    return { rows: result.rows.map(toExecutionRowResponseDto), total: result.total };
  }

  @Get('analytics')
  @RequirePermission('prompt:read')
  async analytics(@CurrentUser() user: AuthenticatedUser, @Query('days') days?: string): Promise<AnalyticsSummary> {
    return this.queryBus.execute<GetPromptAnalyticsQuery, AnalyticsSummary>(
      new GetPromptAnalyticsQuery(user.organizationId, days ? parseInt(days, 10) : 30),
    );
  }

  @Post('playground/execute')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('prompt:manage')
  async runPlayground(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RunPlaygroundDto,
  ): Promise<PromptPlaygroundResult> {
    return this.commandBus.execute<RunPromptPlaygroundCommand, PromptPlaygroundResult>(
      new RunPromptPlaygroundCommand(user.organizationId, dto.promptId, dto.variables, dto.provider),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('prompt:manage')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePromptDto) {
    const prompt = await this.commandBus.execute<CreatePromptCommand, PromptEntity>(
      new CreatePromptCommand(
        dto.capability,
        dto.agentKey,
        dto.name,
        dto.description ?? null,
        dto.category ?? null,
        dto.tags ?? [],
        dto.template,
        dto.jsonSchema ?? {},
        user.userId,
      ),
    );
    return toPromptResponseDto(prompt);
  }

  @Get(':capability')
  @RequirePermission('prompt:read')
  async history(@Param('capability') capability: string) {
    const versions = await this.queryBus.execute<GetPromptHistoryQuery, PromptEntity[]>(
      new GetPromptHistoryQuery(capability),
    );
    return versions.map(toPromptResponseDto);
  }

  @Post(':capability')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('prompt:manage')
  async createVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('capability') capability: string,
    @Body() dto: CreatePromptVersionDto,
  ) {
    const prompt = await this.commandBus.execute<CreatePromptVersionCommand, PromptEntity>(
      new CreatePromptVersionCommand(
        capability,
        dto.template,
        dto.jsonSchema ?? {},
        dto.name ?? null,
        dto.description ?? null,
        dto.category ?? null,
        dto.tags ?? null,
        dto.changeSummary ?? null,
        user.userId,
      ),
    );
    return toPromptResponseDto(prompt);
  }

  @Get(':capability/compare')
  @RequirePermission('prompt:read')
  async compare(
    @Param('capability') capability: string,
    @Query('a') a: string,
    @Query('b') b: string,
  ) {
    const result = await this.queryBus.execute<ComparePromptVersionsQuery, PromptComparisonResult>(
      new ComparePromptVersionsQuery(capability, a, b),
    );
    return { a: toPromptResponseDto(result.a), b: toPromptResponseDto(result.b), templateDiff: result.templateDiff };
  }

  @Get(':capability/variables')
  @RequirePermission('prompt:read')
  async variables(@Param('capability') capability: string, @Query('version') version?: string) {
    return this.queryBus.execute<GetPromptVariablesQuery, string[]>(new GetPromptVariablesQuery(capability, version));
  }

  @Get(':capability/:version')
  @RequirePermission('prompt:read')
  async getVersion(@Param('capability') capability: string, @Param('version') version: string) {
    const prompt = await this.queryBus.execute<GetPromptVersionQuery, PromptEntity | null>(
      new GetPromptVersionQuery(capability, version),
    );
    return prompt ? toPromptResponseDto(prompt) : null;
  }

  @Patch(':capability/:version')
  @RequirePermission('prompt:manage')
  async updateDraft(
    @Param('capability') capability: string,
    @Param('version') version: string,
    @Body() dto: UpdatePromptDraftDto,
  ) {
    const existing = await this.queryBus.execute<GetPromptVersionQuery, PromptEntity | null>(
      new GetPromptVersionQuery(capability, version),
    );
    if (!existing) {
      return null;
    }
    const prompt = await this.commandBus.execute<UpdatePromptDraftCommand, PromptEntity>(
      new UpdatePromptDraftCommand(existing.id, dto),
    );
    return toPromptResponseDto(prompt);
  }

  @Post(':capability/:version/clone')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('prompt:manage')
  async clone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('capability') capability: string,
    @Param('version') version: string,
    @Body() dto: ClonePromptDto,
  ) {
    const source = await this.queryBus.execute<GetPromptVersionQuery, PromptEntity | null>(
      new GetPromptVersionQuery(capability, version),
    );
    if (!source) return null;
    const prompt = await this.commandBus.execute<ClonePromptCommand, PromptEntity>(
      new ClonePromptCommand(
        source.id,
        user.userId,
        dto.asNewCapability && dto.asNewCapabilityAgentKey
          ? { capability: dto.asNewCapability, agentKey: dto.asNewCapabilityAgentKey }
          : undefined,
      ),
    );
    return toPromptResponseDto(prompt);
  }

  @Post(':capability/:version/submit-review')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('prompt:manage')
  async submitForReview(@Param('capability') capability: string, @Param('version') version: string) {
    const existing = await this.mustFind(capability, version);
    const prompt = await this.commandBus.execute<SubmitPromptForReviewCommand, PromptEntity>(
      new SubmitPromptForReviewCommand(existing.id),
    );
    return toPromptResponseDto(prompt);
  }

  @Post(':capability/:version/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('prompt:approve')
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('capability') capability: string,
    @Param('version') version: string,
    @Body() dto: ApprovePromptDto,
  ) {
    const existing = await this.mustFind(capability, version);
    const prompt = await this.commandBus.execute<ApprovePromptCommand, PromptEntity>(
      new ApprovePromptCommand(existing.id, user.userId, dto.rationale ?? null),
    );
    return toPromptResponseDto(prompt);
  }

  @Post(':capability/:version/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('prompt:approve')
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('capability') capability: string,
    @Param('version') version: string,
    @Body() dto: RejectPromptDto,
  ) {
    const existing = await this.mustFind(capability, version);
    const prompt = await this.commandBus.execute<RejectPromptCommand, PromptEntity>(
      new RejectPromptCommand(existing.id, user.userId, dto.rationale),
    );
    return toPromptResponseDto(prompt);
  }

  @Post(':capability/:version/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('prompt:manage')
  async activate(@Param('capability') capability: string, @Param('version') version: string) {
    const existing = await this.mustFind(capability, version);
    const prompt = await this.commandBus.execute<ActivatePromptCommand, PromptEntity>(
      new ActivatePromptCommand(existing.id),
    );
    return toPromptResponseDto(prompt);
  }

  @Post(':capability/:version/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('prompt:manage')
  async archive(@Param('capability') capability: string, @Param('version') version: string) {
    const existing = await this.mustFind(capability, version);
    const prompt = await this.commandBus.execute<ArchivePromptCommand, PromptEntity>(
      new ArchivePromptCommand(existing.id),
    );
    return toPromptResponseDto(prompt);
  }

  @Delete(':capability/:version')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('prompt:manage')
  async delete(@Param('capability') capability: string, @Param('version') version: string): Promise<void> {
    const existing = await this.mustFind(capability, version);
    await this.commandBus.execute<DeletePromptCommand, void>(new DeletePromptCommand(existing.id));
  }

  private async mustFind(capability: string, version: string): Promise<PromptEntity> {
    const prompt = await this.queryBus.execute<GetPromptVersionQuery, PromptEntity | null>(
      new GetPromptVersionQuery(capability, version),
    );
    if (!prompt) {
      throw new NotFoundException('Prompt version not found');
    }
    return prompt;
  }
}
