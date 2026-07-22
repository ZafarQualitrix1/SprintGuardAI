import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RunTestGenerationCommand } from '../application/commands/run-test-generation.command';
import { GetTestScenariosByStoryQuery } from '../application/queries/get-test-scenarios-by-story.query';
import { TestScenarioEntity } from '../domain/entities/test-artifact.entity';
import { TestScenarioDto } from './dto/test-artifact.dto';

function toDto(entity: TestScenarioEntity): TestScenarioDto {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description,
    priority: entity.priority,
    testCases: entity.testCases.map((tc) => ({
      id: tc.id,
      title: tc.title,
      steps: tc.steps,
      priority: tc.priority,
    })),
  };
}

@ApiTags('Test Intelligence')
@Controller('stories/:storyId/tests')
export class TestIntelligenceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('test:read')
  async list(@Param('storyId') storyId: string): Promise<TestScenarioDto[]> {
    const scenarios = await this.queryBus.execute<GetTestScenariosByStoryQuery, TestScenarioEntity[]>(
      new GetTestScenariosByStoryQuery(storyId),
    );
    return scenarios.map(toDto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('test:write')
  async generate(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TestScenarioDto[]> {
    const scenarios = await this.commandBus.execute<RunTestGenerationCommand, TestScenarioEntity[]>(
      new RunTestGenerationCommand(user.organizationId, storyId),
    );
    return scenarios.map(toDto);
  }
}
