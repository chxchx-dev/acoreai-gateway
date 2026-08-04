import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureHttpApp } from './app/configure-http';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = configureHttpApp(app);

  const port = config.get<number>('PORT', 4005);
  await app.listen(port);

  logger.log(`AI Gateway corriendo en http://localhost:${port}`);
  logger.log(`Health live: http://localhost:${port}/health/live`);
  logger.log(`Health ready: http://localhost:${port}/health/ready`);
  logger.log(`Metrics: http://localhost:${port}/metrics`);
  logger.log(`CORS permitido para: ${config.get<string[]>('app.corsOrigins', []).join(', ')}`);
}

bootstrap();
