import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Shared between the local dev entrypoint (main.ts) and the Vercel serverless entrypoint
// (api/index.ts) so both processes configure the Nest app identically.
export async function configureApp(app: INestApplication): Promise<void> {
  // Both entrypoints create the app with bodyParser disabled so the 5mb limit here (default is
  // 100kb) applies everywhere -- needed for organization logo uploads, sent as base64 JSON
  // (2MB file -> ~2.8MB of base64 text).
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Full route shape: /api/v1/<controller-path> -- e.g. POST /api/v1/auth/login.
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
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SprintGuard AI API')
    .setDescription(
      'AI Sprint Quality Intelligence Platform — REST API. See docs/architecture for the full solution architecture and database design.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'apiKey')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
}
