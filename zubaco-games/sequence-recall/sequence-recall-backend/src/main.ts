import { validateEnvironment } from './config/env.validation';
import { RedisIoAdapter } from './ws/redis-io.adapter';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ApiExceptionFilter } from '@common/filters/api-exception.filter';
import { ApiResponseInterceptor } from '@common/interceptors/api-response.interceptor';
import { validateMessages } from '@common/responses';
import { config } from '@config';
import { RequestMethod, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { EncryptionInterceptor } from './crypto/encryption.interceptor';

/**
 * Bootstrap.
 *
 * @returns {Promise<void>} A promise that resolves when the operation completes.
 */
async function bootstrap() {
  validateEnvironment();

    // Validate all language files on startup
    validateMessages();

    const app = await NestFactory.create(AppModule);
    app.useLogger(app.get(Logger));
    app.use(helmet());
  app.use(compression());

        app.setGlobalPrefix('api', {
        exclude: [{ path: 'health', method: RequestMethod.GET }, { path: 'health/live', method: RequestMethod.GET }, { path: 'health/ready', method: RequestMethod.GET }],
    });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : ['*'];
    app.enableCors({
        origin: allowedOrigins.includes('*') ? true : allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Accept-Language'],
        exposedHeaders: ['Authorization'],
        maxAge: 86400,
    });

    // Register global exception filter for standardized error responses
    app.useGlobalFilters(new ApiExceptionFilter());

    // Register global interceptor for standardized success responses
    app.useGlobalInterceptors(app.get(EncryptionInterceptor), new ApiResponseInterceptor());

    // Register global validation pipe for Zod DTOs
    app.useGlobalPipes(new ZodValidationPipe());

    // Swagger/OpenAPI setup
    const swaggerConfig = new DocumentBuilder()
        .setTitle(config.swagger.title)
        .setDescription(config.swagger.description)
        .setVersion(config.swagger.version)
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
        deepScanRoutes: true,
    });
    SwaggerModule.setup('api/docs', app, document);

    app.enableShutdownHooks();

  // Redis WebSocket adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }

    await app.listen(config.server.port);
    console.log(`🚀 Sequence Recall game service running on port ${config.server.port}`);
    console.log(`📚 Swagger available at http://localhost:${config.server.port}/api`);
}

void bootstrap();
