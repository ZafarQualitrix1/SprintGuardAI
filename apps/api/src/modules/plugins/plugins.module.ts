import { Module } from '@nestjs/common';
import { PluginsController } from './presentation/plugins.controller';

// Bounded context module: Plugins
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [PluginsController],
  providers: [],
  exports: [],
})
export class PluginsModule {}
