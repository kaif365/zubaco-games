import { Module } from "@nestjs/common";

import { RedisModule } from "../redis/redis.module";

import { UserHttpService } from "./http/user-http.service";
import { UserService } from "./user.service";

/**
 * Module for player identity verification and user data access.
 */
@Module({
  imports: [RedisModule],
  providers: [UserService, UserHttpService],
  exports: [UserService],
})
export class UserModule {}
