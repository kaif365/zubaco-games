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
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import {
  CreateMazeConfigDto,
  UpdateMazeConfigDto,
} from "./dto/create-maze-config.dto";
import { MazeConfigService } from "./maze-config.service";

@ApiTags("Admin - Maze Config")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("v1/admin/maze-configs")
export class MazeConfigController {
  /**
   * Create a new instance.
   *
   * @param {MazeConfigService} mazeConfigService - maze config service value.
   */
  constructor(private readonly mazeConfigService: MazeConfigService) {}

  /**
   * Create a maze config.
   *
   * @param {CreateMazeConfigDto} dto - dto value.
   *
   * @returns {Promise<object>} The created config.
   */
  @Post()
  @HttpCode(STATUS_CODES.CREATED)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  create(@Body() dto: CreateMazeConfigDto) {
    return this.mazeConfigService.create(dto);
  }

  /**
   * Find all maze configs.
   *
   * @returns {Promise<object[]>} All maze configs.
   */
  @Get()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  findAll() {
    return this.mazeConfigService.findAll();
  }

  /**
   * Find one maze config.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The maze config.
   */
  @Get(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  findOne(@Param("id") id: string) {
    return this.mazeConfigService.findOne(id);
  }

  /**
   * Update a maze config.
   *
   * @param {string} id - id value.
   * @param {UpdateMazeConfigDto} dto - dto value.
   *
   * @returns {Promise<object>} The updated config.
   */
  @Patch(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  update(@Param("id") id: string, @Body() dto: UpdateMazeConfigDto) {
    return this.mazeConfigService.update(id, dto);
  }

  /**
   * Delete a maze config.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The deleted config.
   */
  @Delete(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  remove(@Param("id") id: string) {
    return this.mazeConfigService.remove(id);
  }
}
