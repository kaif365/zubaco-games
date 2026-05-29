import { TOKEN_TYPES, USER_TYPES } from "@common/constants";
import { RequireSession } from "@common/decorators/session.decorator";
import { Transactional } from "@common/decorators/transactional.decorator";
import { SessionGuard } from "@common/guards/session.guard";
import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";

import { DeleteStageConfigsDto } from "./dto/delete-stage-configs.dto";
import { ListStageConfigsDto } from "./dto/list-stage-configs.dto";
import { UpsertStageConfigDto } from "./dto/upsert-stage-config.dto";
import { StageConfigService } from "./stage-config.service";

@ApiTags("Admin — Stage Configs")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("v1/stage-configs")
export class StageConfigController {
  /**
   * Create a new instance.
   *
   * @param {StageConfigService} stageConfigService - stage config service value.
   */
  constructor(private readonly stageConfigService: StageConfigService) {}

  /**
   * Handle upsert.
   *
   * @param {UpsertStageConfigDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Put()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  @Transactional()
  upsert(@Body() dto: UpsertStageConfigDto) {
    return this.stageConfigService.upsert(dto);
  }

  /**
   * Handle remove.
   *
   * @param {DeleteStageConfigsDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Delete()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  @Transactional()
  remove(@Body() dto: DeleteStageConfigsDto) {
    return this.stageConfigService.remove(dto);
  }

  /**
   * Handle list.
   *
   * @param {ListStageConfigsDto} dto - dto value.
   *
   * @returns {Promise<object>} The asynchronous result.
   */
  @Get()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  @Transactional({ readOnly: true })
  list(@Query() dto: ListStageConfigsDto) {
    return this.stageConfigService.list(dto);
  }
}
