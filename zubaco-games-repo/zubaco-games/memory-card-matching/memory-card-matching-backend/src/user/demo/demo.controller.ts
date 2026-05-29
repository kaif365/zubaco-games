import { AuthUser } from "@common/decorators/auth-user.decorator";
import { GameSessionGuard } from "@common/guards/game-session.guard";
import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { EnableEncryption } from "../../crypto/enable-encryption.decorator";

import { DemoService, type DemoResult } from "./demo.service";

@ApiTags("User Demo")
@ApiBearerAuth()
@UseGuards(GameSessionGuard)
@EnableEncryption()
@Controller("user/demo")
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get()
  @ApiOperation({
    summary: "Fetch or lazily generate the local demo payload for this user",
  })
  @ApiOkResponse({ description: "Demo levels grouped by difficulty" })
  getDemo(
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<DemoResult> {
    return this.demoService.getDemo(userId, stageId);
  }
}
