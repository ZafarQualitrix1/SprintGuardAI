import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '@sprintguard/database';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

export interface TestAppContext {
  app: INestApplication;
  prisma: DeepMockProxy<PrismaService>;
}

/**
 * Boots the real AppModule (every guard/pipe/filter/module exactly as production) with
 * PrismaService replaced by a deep mock -- so e2e tests exercise the full HTTP request pipeline
 * (routing, versioning, DTO validation, JWT auth, RBAC, CQRS command/query dispatch) without a
 * live database. Each repository's Prisma calls resolve to whatever the test configures on
 * `prisma`, matching the shape the corresponding mapper (e.g. toMembershipEntity) expects.
 */
export async function createTestApp(): Promise<TestAppContext> {
  const prismaMock = mockDeep<PrismaService>();

  // Prisma's interactive $transaction(callback) form invokes the callback with the client
  // itself -- self-referential so repository code doing
  // `this.prisma.$transaction(async (tx) => tx.model.create(...))` operates against this same
  // mock rather than a second, unconfigured one.
  (prismaMock.$transaction as unknown as jest.Mock).mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: DeepMockProxy<PrismaService>) => unknown)(prismaMock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  return { app, prisma: prismaMock };
}
