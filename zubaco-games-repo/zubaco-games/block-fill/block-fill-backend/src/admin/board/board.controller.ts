import { TOKEN_TYPES, USER_TYPES, STATUS_CODES } from '@common/constants';
import { RequireSession } from '@common/decorators/session.decorator';
import { Transactional } from '@common/decorators/transactional.decorator';
import { SessionGuard } from '@common/guards/session.guard';
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { SkipEncryption } from '../../crypto/skip-encryption.decorator';

import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { DeleteBoardsDto } from './dto/delete-boards.dto';
import { ListBoardsDto } from './dto/list-boards.dto';
import { UpdateBoardBodyDto } from './dto/update-board.dto';
import { ValidateBoardDto } from './dto/validate-board.dto';

@ApiTags('Admin — Boards')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('v1/boards')
export class BoardController {
    constructor(private readonly boardService: BoardService) {}

    @Post()
    @HttpCode(STATUS_CODES.CREATED)
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    create(@Body() dto: CreateBoardDto) {
        return this.boardService.create(dto);
    }

    @Post('validate')
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional({ readOnly: true })
    validate(@Body() dto: ValidateBoardDto) {
        return this.boardService.validate(dto);
    }

    @Put(':id')
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    update(@Param('id') boardId: string, @Body() dto: UpdateBoardBodyDto) {
        return this.boardService.update({ ...dto, boardId });
    }

    @Delete()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    remove(@Body() dto: DeleteBoardsDto) {
        return this.boardService.remove(dto);
    }

    @Get()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional({ readOnly: true })
    list(@Query() dto: ListBoardsDto) {
        return this.boardService.list(dto);
    }

    @Get(':id')
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional({ readOnly: true })
    getDetails(@Param('id') boardId: string) {
        return this.boardService.getDetails(boardId);
    }
}
