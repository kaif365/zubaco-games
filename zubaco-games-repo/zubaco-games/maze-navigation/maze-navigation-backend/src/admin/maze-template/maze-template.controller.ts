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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import {
  CreateMazeTemplateDto,
  GenerateMazeTemplateDto,
  QueryMazeTemplateDto,
  UpdateMazeTemplateDto,
} from "./dto/maze-template.dto";
import { MazeTemplateService } from "./maze-template.service";

@ApiTags("Admin - Maze Template")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("v1/admin/maze-templates")
export class MazeTemplateController {
  constructor(private readonly mazeTemplateService: MazeTemplateService) {}

  @Post()
  @HttpCode(STATUS_CODES.CREATED)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  create(@Body() dto: CreateMazeTemplateDto) {
    return this.mazeTemplateService.create(dto);
  }

  @Post("generate")
  @HttpCode(STATUS_CODES.CREATED)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  generate(@Body() dto: GenerateMazeTemplateDto) {
    return this.mazeTemplateService.generate(dto);
  }

  @Get()
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  findAll(@Query() query: QueryMazeTemplateDto) {
    return this.mazeTemplateService.findAll(query);
  }

  @Patch(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  update(@Param("id") id: string, @Body() dto: UpdateMazeTemplateDto) {
    return this.mazeTemplateService.update(id, dto);
  }

  @Delete(":id")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
  })
  remove(@Param("id") id: string) {
    return this.mazeTemplateService.remove(id);
  }
}
