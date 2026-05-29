import { ApiExceptionFilter } from '@common/filters/api-exception.filter';
import { ApiResponseInterceptor } from '@common/interceptors/api-response.interceptor';
import { validateMessages } from '@common/responses';
import { config } from '@config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
    // Validate all language files on startup
    validateMessages();

    const app = await NestFactory.create(AppModule);

    // Security headers
    app.use(helmet());

    const allowedOrigins = process.env.ADMIN_CORS_ORIGINS
        ? process.env.ADMIN_CORS_ORIGINS.split(',')
        : ['http://localhost:3001'];

    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Accept',
            'Accept-Language',
            'Authorization',
            'Content-Type',
            'X-Requested-With',
            'Access-Control-Request-Method',
            'Access-Control-Request-Headers',
        ],
        exposedHeaders: ['Authorization'],
    });

    // Register global exception filter for standardized error responses
    app.useGlobalFilters(new ApiExceptionFilter());

    // Register global interceptor for standardized success responses
    app.useGlobalInterceptors(new ApiResponseInterceptor());

    // Register global validation pipe for Zod DTOs
    app.useGlobalPipes(new ZodValidationPipe());

    // Swagger/OpenAPI setup (disabled in production)
    if (process.env.NODE_ENV !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle(config.swagger.title)
            .setDescription(config.swagger.description)
            .setVersion(config.swagger.version)
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Paste the admin access token returned by /admin/auth/login',
                },
                'authorization',
            )
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('api', app, document);
    }

    await app.listen(config.server.port);
    console.log(`ZUBACO admin service running on port ${config.server.port}`);
}

void bootstrap();
