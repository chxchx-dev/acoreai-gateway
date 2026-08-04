import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { HttpExceptionFilter } from 'src/interfaces/http/filters/http-exception.filter';

/** Applies the same HTTP pipeline used by the production entrypoint. */
export function configureHttpApp(app: INestApplication): ConfigService {
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
    origin: config.get<string[]>('app.corsOrigins', []),
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

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: false,
    }),
  );

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

  return config;
}
