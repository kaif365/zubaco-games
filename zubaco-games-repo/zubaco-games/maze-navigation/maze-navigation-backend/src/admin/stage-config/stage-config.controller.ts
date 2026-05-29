import { STATUS_CODES } from "@common/constants";
import {
  RequireSession,
  TOKEN_TYPES,
  USER_TYPES,
} from "@common/decorators/session.decorator";
import { SessionGuard } from "@common/guards/session.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import {
  CreateStageConfigDto,
  UpdateStageConfigDto,
} from "./dto/create-stage-config.dto";
import { StageConfigService } from "./stage-config.service";

@ApiTags("Admin - Stage Config")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("v1/admin/stage-configs")
export class StageConfigController {
  /**
   * Create a new instance.
   *
   * @param {StageConfigService} stageConfigService - stage config service value.
   */
  constructor(private readonly stageConfigService: StageConfigService) {}

  /**
   * Find all stage configs.
   *
   * @returns {Promise<object[]>} All stage configs.
   */
  @Get()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  findAll() {
    return this.stageConfigService.findAll();
  }

  /**
   * Find one stage config by stageId.
   *
   * @param {string} stageId - stageId value.
   *
   * @returns {Promise<object>} The stage config.
   */
  @Get(":stageId")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  findOne(@Param("stageId") stageId: string) {
    return this.stageConfigService.findOne(stageId);
  }

  @Put()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  update(@Body() dto: UpdateStageConfigDto) {
    return this.stageConfigService.update(dto);
  }

  /**
   * Delete a stage config by stageId.
   *
   * @param {string} stageId - stageId value.
   *
   * @returns {Promise<object>} The deleted stage config.
   */
  @Delete(":stageId")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  remove(@Param("stageId") stageId: string) {
    return this.stageConfigService.remove(stageId);
  }
}
