import 'reflect-metadata';
import express, { Express, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

// Vercel keeps a warm serverless instance alive across invocations, so the Nest app is
// bootstrapped once per instance and reused rather than re-created on every request.
let cachedHandler: Express | null = null;

async function getHandler(): Promise<Express> {
  if (!cachedHandler) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bodyParser: false });
    await configureApp(app);
    await app.init();
    cachedHandler = expressApp;
  }
  return cachedHandler;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const app = await getHandler();
  app(req, res);
}
