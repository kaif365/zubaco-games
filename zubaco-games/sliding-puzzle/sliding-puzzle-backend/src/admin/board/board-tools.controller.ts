import { ApiKeyGuard } from '@common/guards/api-key.guard';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import { BoardService } from './board.service';
import { GenerateShufflesDto } from './dto/generate-shuffles.dto';

@ApiTags('Board Tools')
@ApiSecurity('X-API-KEY')
@UseGuards(ApiKeyGuard)
@Controller('v1/board-tools')
export class BoardToolsController {
    /**
     * Create a new instance.
     *
     * @param {BoardService} boardService - board service value.
     */
    constructor(private readonly boardService: BoardService) {}

    /**
     * Generate solvable board shuffles for admin tooling.
     *
     * @param {GenerateShufflesDto} dto - dto value.
     *
     * @returns {number[][]} The generated shuffle pieces.
     */
    @Get('generate-shuffles')
    generateShuffles(@Query() dto: GenerateShufflesDto) {
        return this.boardService.generateShuffles(dto.gridX, dto.gridY, dto.count);
    }
}
