import { validateEnvironment } from './config/env.validation';
import { RedisIoAdapter } from './ws/redis-io.adapter';
import { Logger } from 'nestjs-pino';
import "reflect-metadata";

import { ApiExceptionFilter } from "@common/filters/api-exception.filter";
import { ApiResponseInterceptor } from "@common/interceptors/api-response.interceptor";
import { config } from "@config";
import { RequestMethod, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import { ZodValidationPipe } from "nestjs-zod";

import { AppModule } from "./app.module";

/**
 * Bootstrap the NestJS application and global platform integrations.
 *
 * @returns {Promise<void>} Resolves when the application starts listening.
 */
async function bootstrap(): Promise<void> {
  validateEnvironment();

  const app = await NestFactory.create(AppModule);
    app.useLogger(app.get(Logger));

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }, { path: 'health/live', method: RequestMethod.GET }, { path: 'health/ready', method: RequestMethod.GET }],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.use(
    helmet({
      contentSecurityPolicy:
        config.nodeEnv === "production" ? undefined : false,
    }),
  );
  app.use(compression());
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['*'];
  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization'],
    maxAge: 86400,
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.swagger.title)
    .setDescription(config.swagger.description)
    .setVersion(config.swagger.version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  // Redis WebSocket adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }

    await app.listen(config.server.port);
  console.log(
    `Memory Card Matching backend running on port ${config.server.port}`,
  );
  console.log(
    `Swagger available at http://localhost:${config.server.port}/api`,
  );
}

void bootstrap();
