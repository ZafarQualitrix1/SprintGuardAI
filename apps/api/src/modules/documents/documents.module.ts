import { Module } from '@nestjs/common';
import { DocumentsController } from './presentation/documents.controller';

// Bounded context module: Documents
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Command/Query handlers, port implementations, and repositories are registered here as they
// are implemented in later steps of the build sequence.
@Module({
  controllers: [DocumentsController],
  providers: [],
  exports: [],
})
export class DocumentsModule {}
