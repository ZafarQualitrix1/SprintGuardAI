import { Module } from '@nestjs/common';
import { KnowledgeController } from './presentation/knowledge.controller';

// Bounded context module: Knowledge
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [KnowledgeController],
  providers: [],
  exports: [],
})
export class KnowledgeModule {}
