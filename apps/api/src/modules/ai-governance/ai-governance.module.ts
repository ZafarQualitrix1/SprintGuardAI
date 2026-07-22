import { Module } from '@nestjs/common';
import { AiGovernanceController } from './presentation/ai-governance.controller';

// Bounded context module: AiGovernance
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [AiGovernanceController],
  providers: [],
  exports: [],
})
export class AiGovernanceModule {}
