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
    Body,
    Query,
    HttpCode,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { DeleteBoardsDto } from './dto/delete-boards.dto';
import { GetBoardDto } from './dto/get-board.dto';
import { ListBoardsDto } from './dto/list-boards.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@ApiTags('Admin — Boards')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('v1/boards')
export class BoardController {
    /**
     * Create a new instance.
     *
     * @param {BoardService} boardService - board service value.
     */
    constructor(private readonly boardService: BoardService) {}

    /**
     * Handle create.
     *
     * @param {CreateBoardDto} dto - dto value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    @Post()
    @HttpCode(STATUS_CODES.CREATED)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    create(@Body() dto: CreateBoardDto) {
        return this.boardService.create(dto);
    }

    /**
     * Handle update.
     *
     * @param {UpdateBoardDto} dto - dto value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    @Put()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    update(@Body() dto: UpdateBoardDto) {
        return this.boardService.update(dto);
    }

    /**
     * Handle remove.
     *
     * @param {DeleteBoardsDto} dto - dto value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    @Delete()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    remove(@Body() dto: DeleteBoardsDto) {
        return this.boardService.remove(dto);
    }

    /**
     * Handle list.
     *
     * @param {ListBoardsDto} dto - dto value.
     *
     * @returns {Promise<{ data: { id: string; name: string; createdAt: Date; level: { id: string; name: string; }; gridSize: { x: number; y: number; }; }[]; totalCount: number; }>} The asynchronous result.
     */
    @Get()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional({ readOnly: true })
    list(@Query() dto: ListBoardsDto) {
        return this.boardService.list(dto);
    }

    /**
     * Get board details, including all active shuffles.
     *
     * @param {GetBoardDto} dto - dto value.
     *
     * @returns {Promise<{ id: string; name: string; createdAt: Date; level: { id: string; name: string; }; gridSize: { x: number; y: number; }; fullImageUrl: string; shuffles: { id: string; pieces: number[]; createdAt: Date; }[]; }>} The asynchronous result.
     */
    @Get('details')
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional({ readOnly: true })
    getDetails(@Query() dto: GetBoardDto) {
        return this.boardService.getDetails(dto.boardId);
    }
}
