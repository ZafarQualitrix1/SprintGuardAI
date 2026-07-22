import { Module } from '@nestjs/common';
import { AgentsController } from './presentation/agents.controller';

// Bounded context module: Agents
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [AgentsController],
  providers: [],
  exports: [],
})
export class AgentsModule {}
