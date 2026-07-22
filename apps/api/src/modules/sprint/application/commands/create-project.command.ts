import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  PROJECT_REPOSITORY,
  IProjectRepository,
} from '../../domain/repositories/project.repository.interface';
import { ProjectEntity } from '../../domain/entities/project.entity';

export class CreateProjectCommand {
  constructor(
    public readonly organizationId: string,
    public readonly key: string,
    public readonly name: string,
    public readonly description?: string,
  ) {}
}

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand, ProjectEntity> {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository) {}

  async execute(command: CreateProjectCommand): Promise<ProjectEntity> {
    const normalizedKey = command.key.trim().toUpperCase();
    const existing = await this.projectRepository.findByKey(command.organizationId, normalizedKey);
    if (existing) {
      throw new ConflictException(`A project with key "${normalizedKey}" already exists`);
    }

    return this.projectRepository.create({
      organizationId: command.organizationId,
      key: normalizedKey,
      name: command.name,
      description: command.description,
    });
  }
}
