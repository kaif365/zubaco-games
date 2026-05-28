import 'dotenv/config';
import { validateEnvironment } from './config/env.validation';
import { RedisIoAdapter } from './ws/redis-io.adapter';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
// import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { appConfig } from './common/config/app.config';
import { ZodValidationPipe } from 'nestjs-zod';

async function bootstrap() {
  validateEnvironment();

  const corsOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean);
  if (process.env.NODE_ENV === 'production' && (!corsOrigins || corsOrigins.length === 0)) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS middleware
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    const allowed = !corsOrigins || corsOrigins.length === 0 || corsOrigins.includes(origin);
    if (origin && allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key,X-Signature,X-Timestamp,X-Correlation-ID');
      res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-ID,X-Request-ID');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Security
  app.use(compression());
  app.useGlobalPipes(new ZodValidationPipe());

  // API Versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Colour Sorting API')
    .setDescription('ZUBACO Gaming Engine - Colour Sorting Microservice')
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
  console.log(`Colour Sorting backend running on port ${appConfig.port} | API: /api/v1`);
}
bootstrap();

