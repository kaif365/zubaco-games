import { HttpModule } from "@nestjs/axios";
import { Global, Module } from "@nestjs/common";

import { UserHttpService } from "./http/user-http.service";
import { UserService } from "./user.service";

@Global()
@Module({
  imports: [HttpModule],
  providers: [UserService, UserHttpService],
  exports: [UserService],
})
export class UserModule {}
