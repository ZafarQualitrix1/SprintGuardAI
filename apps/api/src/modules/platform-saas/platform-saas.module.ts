import { Module } from '@nestjs/common';
import { PlatformSaasController } from './presentation/platform-saas.controller';

// Bounded context module: PlatformSaas
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [PlatformSaasController],
  providers: [],
  exports: [],
})
export class PlatformSaasModule {}
