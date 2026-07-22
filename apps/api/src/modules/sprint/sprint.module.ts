import { Module } from '@nestjs/common';
import { ProjectsController } from './presentation/projects.controller';
import { SprintsController } from './presentation/sprints.controller';

import { SPRINT_COMMAND_HANDLERS } from './application/commands';
import { SPRINT_QUERY_HANDLERS } from './application/queries';
import { PROJECT_REPOSITORY } from './domain/repositories/project.repository.interface';
import { SPRINT_REPOSITORY } from './domain/repositories/sprint.repository.interface';

import { PrismaProjectRepository } from './infrastructure/repositories/prisma-project.repository';
import { PrismaSprintRepository } from './infrastructure/repositories/prisma-sprint.repository';

// Bounded context module: Project & Sprint (Solution Architecture §6).
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// ImportSprintFromJiraHandler depends on the `integration` module's FetchExternalSprintQuery via
// the global QueryBus (CqrsModule) -- no direct import of Integration's Infrastructure.
@Module({
  controllers: [ProjectsController, SprintsController],
  providers: [
    ...SPRINT_COMMAND_HANDLERS,
    ...SPRINT_QUERY_HANDLERS,
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: SPRINT_REPOSITORY, useClass: PrismaSprintRepository },
  ],
  exports: [],
})
export class SprintModule {}
