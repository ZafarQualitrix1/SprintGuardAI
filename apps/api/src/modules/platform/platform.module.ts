import { Module } from '@nestjs/common';
import { PlatformController } from './presentation/platform.controller';

// Bounded context module: Platform
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [PlatformController],
  providers: [],
  exports: [],
})
export class PlatformModule {}
