import { Module } from '@nestjs/common';
import { AiOpsController } from './presentation/ai-ops.controller';

// Bounded context module: AiOps
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [AiOpsController],
  providers: [],
  exports: [],
})
export class AiOpsModule {}
