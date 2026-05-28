import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpCacheInterceptor } from './http-cache.interceptor';
import { CacheInvalidationService } from './cache-invalidation.service';

@Global()
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    CacheInvalidationService,
  ],
  exports: [CacheInvalidationService],
})
export class HttpCacheModule {}
