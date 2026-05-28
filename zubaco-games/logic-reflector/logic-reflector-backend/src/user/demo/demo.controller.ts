import { CurrentUser } from "@common/decorators/current-user.decorator";
import {
  RequireSession,
  TOKEN_TYPES,
  USER_TYPES,
} from "@common/decorators/session.decorator";
import { Transactional } from "@common/decorators/transactional.decorator";
import { SessionGuard } from "@common/guards/session.guard";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { EnableEncryption } from "../../crypto/enable-encryption.decorator";

import { DemoService } from "./demo.service";

@ApiTags("User Demo")
@ApiBearerAuth()
@Controller("v1/user/demo")
@UseGuards(SessionGuard)
@EnableEncryption()
export class DemoController {
  /**
   * Create a new instance.
   *
   * @param {DemoService} demoService - demo service value.
   */
  constructor(private readonly demoService: DemoService) {}

  /**
   * Get demo.
   *
   * @param {{ id: string; stageId: string }} user - user value.
   *
   * @returns {Promise<DemoResult>} The asynchronous result.
   */
  @Get()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.USER],
  })
  @Transactional()
  getDemo(@CurrentUser() user: { id: string; stageId: string }) {
    return this.demoService.getDemo(user.id, user.stageId);
  }
}
