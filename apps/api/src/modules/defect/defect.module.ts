import { Module } from '@nestjs/common';
import { DefectController } from './presentation/defect.controller';

// Bounded context module: Defect
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [DefectController],
  providers: [],
  exports: [],
})
export class DefectModule {}
