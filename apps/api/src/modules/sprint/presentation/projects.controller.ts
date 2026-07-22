import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CreateProjectCommand } from '../application/commands/create-project.command';
import { ListProjectsQuery } from '../application/queries/list-projects.query';
import { ProjectEntity } from '../domain/entities/project.entity';
import { ProjectDto } from './dto/project.dto';
import { CreateProjectDto } from './dto/create-project.dto';

function toDto(entity: ProjectEntity): ProjectDto {
  return { id: entity.id, key: entity.key, name: entity.name, description: entity.description };
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
