import { Module } from '@nestjs/common';
import { RealtimeController } from './presentation/realtime.controller';

// Bounded context module: Realtime
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [RealtimeController],
  providers: [],
  exports: [],
})
export class RealtimeModule {}
