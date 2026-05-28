import { STATUS_CODES } from "@common/constants";
import { AdminAuthGuard } from "@common/guards/admin-auth.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
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

import { CreateLevelDto } from "./dto/create-level.dto";
import { DeleteLevelsDto } from "./dto/delete-levels.dto";
import { GetLevelDto } from "./dto/get-level.dto";
import { ListLevelsDto } from "./dto/list-levels.dto";
import { UpdateLevelDto } from "./dto/update-level.dto";
import { LevelService } from "./level.service";

/**
 * Controller for admin-managed playable memory-card levels.
 */
@ApiTags("Admin - Levels")
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller("levels")
export class LevelController {
  /**
   * Create a new instance.
   *
   * @param {LevelService} levelService - level service value.
   */
  constructor(private readonly levelService: LevelService) {}

  /**
   * Handle create.
   *
   * @param {CreateLevelDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Post()
  @HttpCode(STATUS_CODES.CREATED)
  @ApiOperation({ summary: "Create a playable level inside a difficulty pool" })
  @ApiBody({
    type: CreateLevelDto,
    examples: {
      imageLevel: {
        value: {
          difficultyId: "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
          name: "Animals 4x4",
          gridRows: 4,
          gridColumns: 4,
          cardContentType: "image",
          previewDurationSeconds: 5,
          mismatchDisplayDurationSeconds: 1,
          contentConfig: {
            type: "image",
            assetKeys: [
              "uploads/cat.png",
              "uploads/dog.png",
              "uploads/lion.png",
              "uploads/tiger.png",
              "uploads/bird.png",
              "uploads/fish.png",
              "uploads/horse.png",
              "uploads/rabbit.png",
            ],
          },
        },
      },
    },
  })
  create(@Body() dto: CreateLevelDto) {
    return this.levelService.create(dto);
  }

  /**
   * Handle update.
   *
   * @param {UpdateLevelDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Put()
  @ApiOperation({ summary: "Update a playable level in the admin pool" })
  @ApiBody({
    type: UpdateLevelDto,
    examples: {
      symbolLevel: {
        value: {
          levelId: "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
          difficultyId: "196a4adf-727d-4f70-ac17-1bd0af2e2e4a",
          name: "Symbols 4x4",
          gridRows: 4,
          gridColumns: 4,
          cardContentType: "symbol",
          previewDurationSeconds: 4,
          mismatchDisplayDurationSeconds: 1,
          contentConfig: {
            type: "symbol",
            items: [
              "star",
              "moon",
              "heart",
              "sun",
              "leaf",
              "bolt",
              "cloud",
              "drop",
            ],
          },
        },
      },
    },
  })
  update(@Body() dto: UpdateLevelDto) {
    return this.levelService.update(dto);
  }

  /**
   * Handle remove.
   *
   * @param {DeleteLevelsDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Delete()
  @ApiOperation({ summary: "Soft delete one or more playable levels" })
  @ApiBody({
    type: DeleteLevelsDto,
    examples: {
      multiple: {
        value: {
          levelIds: [
            "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
            "196a4adf-727d-4f70-ac17-1bd0af2e2e4a",
          ],
        },
      },
    },
  })
  remove(@Body() dto: DeleteLevelsDto) {
    return this.levelService.remove(dto);
  }

  /**
   * Handle list.
   *
   * @param {ListLevelsDto} dto - dto value.
   *
   * @returns {ReturnType<LevelService["list"]>} The asynchronous result.
   */
  @Get()
  @ApiOperation({ summary: "List playable levels with optional filters" })
  @ApiQuery({ name: "skip", required: false, example: 0 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiQuery({ name: "search", required: false, example: "Animals" })
  @ApiQuery({
    name: "difficultyId",
    required: false,
    example: "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
  })
  @ApiQuery({ name: "cardContentType", required: false, example: "image" })
  @ApiQuery({ name: "gridRows", required: false, example: 4 })
  @ApiQuery({ name: "gridColumns", required: false, example: 4 })
  list(@Query() dto: ListLevelsDto) {
    return this.levelService.list(dto);
  }

  /**
   * Handle details.
   *
   * @param {GetLevelDto} dto - dto value.
   *
   * @returns {ReturnType<LevelService["getDetails"]>} The asynchronous result.
   */
  @Get("details")
  @ApiOperation({ summary: "Fetch one playable level with its difficulty" })
  @ApiQuery({
    name: "levelId",
    required: true,
    example: "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
  })
  getDetails(@Query() dto: GetLevelDto) {
    return this.levelService.getDetails(dto.levelId);
  }
}
