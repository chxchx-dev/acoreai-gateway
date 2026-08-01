import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from 'src/interfaces/http/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  const httpLogger = pinoHttp({
    logger: pino({
      level: config.get<string>('LOG_LEVEL', 'info'),
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
    }),
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const requestId = Array.isArray(existing) ? existing[0] : existing;
      const id = requestId?.trim() || randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customProps: (req) => ({
      requestId: req.id,
    }),
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
  app.use(httpLogger);

  app.enableCors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-ai-gateway-key',
      'x-request-id',
    ],
    exposedHeaders: ['X-Trial-Questions-Used', 'X-Trial-Max-Questions', 'x-request-id'],
    optionsSuccessStatus: 204,
  });

  // Body limit explícito antes de cualquier middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use('/demo', express.static(path.join(process.cwd(), 'public', 'demo')));

  app.use(
    helmet({
      // Permite que el navegador cargue audio/binarios (TTS) desde otro origen
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // No forzar same-origin en el opener para no bloquear SSE streams
      crossOriginOpenerPolicy: false,
    }),
  );

  // /health/*, /metrics y / quedan fuera del prefijo /api
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'health/live', 'health/ready', 'health/deep', 'metrics'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('PORT', 4005);
  await app.listen(port);

  logger.log(`OLAN AI Gateway corriendo en http://localhost:${port}`);
  logger.log(`Health live: http://localhost:${port}/health/live`);
  logger.log(`Health ready: http://localhost:${port}/health/ready`);
  logger.log(`Metrics: http://localhost:${port}/metrics`);
  logger.warn('CORS abierto temporalmente para cualquier origin');
}

bootstrap();
