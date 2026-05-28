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

import { DifficultyService } from "./difficulty.service";
import { CreateDifficultyDto } from "./dto/create-difficulty.dto";
import { DeleteDifficultiesDto } from "./dto/delete-difficulties.dto";
import { ListDifficultiesDto } from "./dto/list-difficulties.dto";
import { UpdateDifficultyDto } from "./dto/update-difficulty.dto";

/**
 * Controller for admin-managed difficulty buckets.
 */
@ApiTags("Admin - Difficulties")
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller("difficulties")
export class DifficultyController {
  /**
   * Create a new instance.
   *
   * @param {DifficultyService} difficultyService - difficulty service value.
   */
  constructor(private readonly difficultyService: DifficultyService) {}

  /**
   * Handle create.
   *
   * @param {CreateDifficultyDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Post()
  @HttpCode(STATUS_CODES.CREATED)
  @ApiOperation({ summary: "Create a difficulty bucket for playable levels" })
  @ApiBody({
    type: CreateDifficultyDto,
    examples: {
      easy: {
        value: {
          name: "Easy",
        },
      },
    },
  })
  create(@Body() dto: CreateDifficultyDto) {
    return this.difficultyService.create(dto);
  }

  /**
   * Handle update.
   *
   * @param {UpdateDifficultyDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Put()
  @ApiOperation({ summary: "Rename an existing difficulty bucket" })
  @ApiBody({
    type: UpdateDifficultyDto,
    examples: {
      medium: {
        value: {
          difficultyId: "3fd6d311-18d8-4ef2-a758-bd0cf2d5430f",
          name: "Medium",
        },
      },
    },
  })
  update(@Body() dto: UpdateDifficultyDto) {
    return this.difficultyService.update(dto);
  }

  /**
   * Handle remove.
   *
   * @param {DeleteDifficultiesDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  @Delete()
  @ApiOperation({ summary: "Soft delete one or more unused difficulties" })
  @ApiBody({
    type: DeleteDifficultiesDto,
    examples: {
      remove: {
        value: {
          difficultyIds: ["3fd6d311-18d8-4ef2-a758-bd0cf2d5430f"],
        },
      },
    },
  })
  remove(@Body() dto: DeleteDifficultiesDto) {
    return this.difficultyService.remove(dto);
  }

  /**
   * Handle list.
   *
   * @param {ListDifficultiesDto} dto - dto value.
   *
   * @returns {ReturnType<DifficultyService["list"]>} The asynchronous result.
   */
  @Get()
  @ApiOperation({ summary: "List configured difficulty buckets" })
  @ApiQuery({ name: "skip", required: false, example: 0 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiQuery({ name: "search", required: false, example: "Easy" })
  list(@Query() dto: ListDifficultiesDto) {
    return this.difficultyService.list(dto);
  }
}
