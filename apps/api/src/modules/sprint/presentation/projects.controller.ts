import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CreateProjectCommand } from '../application/commands/create-project.command';
import { ListProjectsQuery } from '../application/queries/list-projects.query';
import { ListProjectsWithSprintsQuery } from '../application/queries/list-projects-with-sprints.query';
import { ProjectEntity } from '../domain/entities/project.entity';
import { ProjectWithSprints } from '../domain/repositories/project.repository.interface';
import { ProjectDto, ProjectWithSprintsDto } from './dto/project.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { toSprintDto } from './sprints.controller';

function toDto(entity: ProjectEntity): ProjectDto {
  return { id: entity.id, key: entity.key, name: entity.name, description: entity.description };
}

function toWithSprintsDto(entry: ProjectWithSprints): ProjectWithSprintsDto {
  return { ...toDto(entry.project), sprints: entry.sprints.map(toSprintDto) };
}

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('sprint:read')
  async list(@CurrentUser() user: AuthenticatedUser): Promise<ProjectDto[]> {
    const projects = await this.queryBus.execute<ListProjectsQuery, ProjectEntity[]>(
      new ListProjectsQuery(user.organizationId),
    );
    return projects.map(toDto);
  }

  // Backs the Sprint Dashboard page: one request for every project + its sprints, instead of the
  // page firing one request per project on top of this list (see ProjectWithSprints doc comment).
  @Get('with-sprints')
  @RequirePermission('sprint:read')
  async listWithSprints(@CurrentUser() user: AuthenticatedUser): Promise<ProjectWithSprintsDto[]> {
    const projects = await this.queryBus.execute<ListProjectsWithSprintsQuery, ProjectWithSprints[]>(
      new ListProjectsWithSprintsQuery(user.organizationId),
    );
    return projects.map(toWithSprintsDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('sprint:write')
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectDto> {
    const project = await this.commandBus.execute<CreateProjectCommand, ProjectEntity>(
      new CreateProjectCommand(user.organizationId, dto.key, dto.name, dto.description),
    );
    return toDto(project);
  }
}
