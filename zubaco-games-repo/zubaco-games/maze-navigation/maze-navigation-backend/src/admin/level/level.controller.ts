import { STATUS_CODES } from "@common/constants";
import { CurrentUser } from "@common/decorators/current-user.decorator";
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
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreateLevelDto, UpdateLevelDto } from "./dto/create-level.dto";
import { LevelService } from "./level.service";

@ApiTags("Admin - Level")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("v1/admin/levels")
export class LevelController {
  /**
   * Create a new instance.
   *
   * @param {LevelService} levelService - level service value.
   */
  constructor(private readonly levelService: LevelService) {}

  /**
   * Create a level.
   *
   * @param {CreateLevelDto} dto - dto value.
   *
   * @returns {Promise<object>} The created level.
   */
  @Post()
  @HttpCode(STATUS_CODES.CREATED)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  create(@Body() dto: CreateLevelDto) {
    return this.levelService.create(dto);
  }

  /**
   * Find all levels.
   *
   * @returns {Promise<object[]>} All levels.
   */
  @Get()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  findAll() {
    return this.levelService.findAll();
  }

  /**
   * Find one level.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The level.
   */
  @Get(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  findOne(@Param("id") id: string) {
    return this.levelService.findOne(id);
  }

  /**
   * Update a level.
   *
   * @param {string} id - id value.
   * @param {UpdateLevelDto} dto - dto value.
   *
   * @returns {Promise<object>} The updated level.
   */
  @Patch(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  update(@Param("id") id: string, @Body() dto: UpdateLevelDto) {
    return this.levelService.update(id, dto);
  }

  /**
   * Delete a level.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The deleted level.
   */
  @Delete(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  remove(@Param("id") id: string) {
    return this.levelService.remove(id);
  }
}
