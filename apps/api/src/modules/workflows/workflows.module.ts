import { Module } from '@nestjs/common';
import { WorkflowsController } from './presentation/workflows.controller';

// Bounded context module: Workflows
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [WorkflowsController],
  providers: [],
  exports: [],
})
export class WorkflowsModule {}
