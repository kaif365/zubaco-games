import { TOKEN_TYPES, USER_TYPES, STATUS_CODES } from "@common/constants";
import { RequireSession } from "@common/decorators/session.decorator";
import { Transactional } from "@common/decorators/transactional.decorator";
import { SessionGuard } from "@common/guards/session.guard";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  HttpCode,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";

import { CreateLevelDto } from "./dto/create-level.dto";
import { DeleteLevelsDto } from "./dto/delete-levels.dto";
import { ListLevelsDto } from "./dto/list-levels.dto";
import { UpdateLevelDto } from "./dto/update-level.dto";
import { LevelService } from "./level.service";

@ApiTags("Admin — Levels")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("v1/levels")
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
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  @Transactional()
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
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  @Transactional()
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
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  @Transactional()
  remove(@Body() dto: DeleteLevelsDto) {
    return this.levelService.remove(dto);
  }

  /**
   * Handle list.
   *
   * @param {ListLevelsDto} dto - dto value.
   *
   * @returns {Promise<{ data: { id: string; name: string; createdAt: Date; }[]; totalCount: number; }>} The asynchronous result.
   */
  @Get()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  @Transactional({ readOnly: true })
  list(@Query() dto: ListLevelsDto) {
    return this.levelService.list(dto);
  }
}
