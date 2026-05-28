import 'dotenv/config';
import { validateEnvironment } from './config/env.validation';
import { RedisIoAdapter } from './ws/redis-io.adapter';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
// import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { appConfig } from './common/config/app.config';

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new GlobalExceptionFilter());


  // Security
  app.use(helmet());
  app.use(compression());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // API Versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // CORS
  // CORS - strict in production
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean);
  if (process.env.NODE_ENV === 'production' && (!corsOrigins || corsOrigins.length === 0)) {
    throw new Error('CORS_ORIGINS is required in production');
  }
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    maxAge: 86400,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Signature', 'X-Timestamp', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID', 'X-Request-ID'],
  });

    // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Word Unscramble API')
    .setDescription('ZUBACO Gaming Engine - Word Unscramble Microservice')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  // Graceful shutdown
  app.enableShutdownHooks();


  // Redis WebSocket adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }

  await app.listen(appConfig.port);
  console.log(`Word Unscramble backend running on port ${appConfig.port} | API: /api/v1`);
}
bootstrap();

