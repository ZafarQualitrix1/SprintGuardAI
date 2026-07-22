import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RunRequirementIntelligenceAgentCommand } from '../application/commands/run-requirement-intelligence-agent.command';
import { GetRequirementsByStoryQuery } from '../application/queries/get-requirements-by-story.query';
import { RequirementEntity } from '../domain/entities/requirement.entity';
import { RequirementDto } from './dto/requirement.dto';

function toDto(entity: RequirementEntity): RequirementDto {
  return {
    id: entity.id,
    text: entity.text,
    type: entity.type,
    confidenceScore: entity.confidenceScore,
    acceptanceCriteria: entity.acceptanceCriteria.map((ac) => ({
      id: ac.id,
      given: ac.given,
      when: ac.when,
      then: ac.then,
    })),
  };
}

@ApiTags('Requirement Intelligence')
@Controller('stories/:storyId/requirements')
export class RequirementIntelligenceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('requirement:read')
  async list(@Param('storyId') storyId: string): Promise<RequirementDto[]> {
    const requirements = await this.queryBus.execute<GetRequirementsByStoryQuery, RequirementEntity[]>(
      new GetRequirementsByStoryQuery(storyId),
    );
    return requirements.map(toDto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('requirement:write')
  async generate(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RequirementDto[]> {
    const requirements = await this.commandBus.execute<
      RunRequirementIntelligenceAgentCommand,
      RequirementEntity[]
    >(new RunRequirementIntelligenceAgentCommand(user.organizationId, storyId));
    return requirements.map(toDto);
  }
}
