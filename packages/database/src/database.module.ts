import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global module: every feature module gets PrismaService injected without re-importing this
// module explicitly (Solution Architecture §3 Modular Monolith -- one shared persistence layer
// across bounded contexts, accessed only through each module's own repositories).
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
