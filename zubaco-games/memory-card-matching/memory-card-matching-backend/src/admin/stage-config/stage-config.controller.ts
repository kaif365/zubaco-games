import { STATUS_CODES } from "@common/constants";
import { AdminAuthGuard } from "@common/guards/admin-auth.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { DeleteStageConfigsDto } from "./dto/delete-stage-configs.dto";
import { ListStageConfigsDto } from "./dto/list-stage-configs.dto";
import { UpsertStageConfigDto } from "./dto/upsert-stage-config.dto";
import { StageConfigService } from "./stage-config.service";

/**
 * Controller for admin-managed stage configuration.
 */
@ApiTags("Admin - Stage Configs")
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller("stage-configs")
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
   * @returns {Promise<{ saved: true }>} The asynchronous result.
   */
  @Put()
  @HttpCode(STATUS_CODES.OK)
  @ApiOperation({
    summary: "Create or update the stage configuration used by gameplay",
  })
  @ApiBody({
    type: UpsertStageConfigDto,
    examples: {
      defaultStage: {
        value: {
          stageId: "default",
          timeLimit: 120,
          enableDemo: true,
          demoLevels: [
            {
              difficultyId: "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
              boardCount: 1,
            },
          ],
          levels: [
            {
              difficultyId: "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
              boardCount: 3,
            },
          ],
        },
      },
    },
  })
  upsert(@Body() dto: UpsertStageConfigDto) {
    return this.stageConfigService.upsert(dto);
  }

  /**
   * Handle remove.
   *
   * @param {DeleteStageConfigsDto} dto - dto value.
   *
   * @returns {Promise<{ deleted: true }>} The asynchronous result.
   */
  @Delete()
  @ApiOperation({ summary: "Soft delete one or more stage configs" })
  @ApiBody({
    type: DeleteStageConfigsDto,
    examples: {
      deleteDefault: {
        value: {
          stageIds: ["default"],
        },
      },
    },
  })
  remove(@Body() dto: DeleteStageConfigsDto) {
    return this.stageConfigService.remove(dto);
  }

  /**
   * Handle list.
   *
   * @param {ListStageConfigsDto} dto - dto value.
   *
   * @returns {ReturnType<StageConfigService["list"]>} The asynchronous result.
   */
  @Get()
  @ApiOperation({
    summary: "List stage configs with pagination and optional filters",
  })
  @ApiQuery({ name: "skip", required: false, example: 0 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiQuery({ name: "stageId", required: false, example: "default" })
  list(@Query() dto: ListStageConfigsDto) {
    return this.stageConfigService.list(dto);
  }
}
