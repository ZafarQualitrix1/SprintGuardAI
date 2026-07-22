import { Module } from '@nestjs/common';
import { FeatureManagementController } from './presentation/feature-management.controller';

// Bounded context module: FeatureManagement
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [FeatureManagementController],
  providers: [],
  exports: [],
})
export class FeatureManagementModule {}
