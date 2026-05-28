import { validateEnvironment } from './config/env.validation';
import { RedisIoAdapter } from './ws/redis-io.adapter';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ApiExceptionFilter } from '@common/filters/api-exception.filter';
import { ApiResponseInterceptor } from '@common/interceptors/api-response.interceptor';
import { validateMessages } from '@common/responses';
import { config } from '@config';
import { ConsoleLogger, VersioningType, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';

class AppLogger extends ConsoleLogger {
    log(message: any, context?: string) {
        if (config.env !== 'production' || context === 'HTTP') {
            super.log(message, context);
        }
    }

    debug(message: any, context?: string) {
        if (config.env !== 'production') {
            super.debug(message, context);
        }
    }

    verbose(message: any, context?: string) {
        if (config.env !== 'production') {
            super.verbose(message, context);
        }
    }

    warn(message: any, context?: string) {
        if (config.env !== 'production' || context === 'HTTP') {
            super.warn(message, context);
        }
    }
}

async function bootstrap() {
  validateEnvironment();

    // Validate all language files on startup
    validateMessages();

    const app = await NestFactory.create(AppModule, {
        logger: new AppLogger(),
    });
    app.useLogger(app.get(Logger));
    app.use(helmet());
  app.use(compression());

    // CORS
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
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        exposedHeaders: ['Authorization'],
        maxAge: 86400,
    });

    // Register global exception filter for standardized error responses
    app.useGlobalFilters(new ApiExceptionFilter());

    // Register global interceptor for standardized success responses
    app.useGlobalInterceptors(new ApiResponseInterceptor());

    // Register global validation pipe for Zod DTOs
    app.useGlobalPipes(new ZodValidationPipe());

    // Swagger/OpenAPI — explicit opt-in only
    if (config.security.enableSwagger) {
        const swaggerConfig = new DocumentBuilder()
            .setTitle(config.swagger.title)
            .setDescription(config.swagger.description)
            .setVersion(config.swagger.version)
            .addBearerAuth()
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('api/docs', app, document);
    }

    const port = Number(process.env.PORT) || config.server.port || 3004;
    app.enableShutdownHooks();

  // Redis WebSocket adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }

    await app.listen(port);
}

void bootstrap();
