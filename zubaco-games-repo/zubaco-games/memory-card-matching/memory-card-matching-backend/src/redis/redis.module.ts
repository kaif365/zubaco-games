import { Module } from "@nestjs/common";

import { RedisService } from "./redis.service";

/**
 * Module for Redis-backed cache access.
 */
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
