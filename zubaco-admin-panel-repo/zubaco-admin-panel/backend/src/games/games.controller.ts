import {
    Public,
    RequireSession,
    TOKEN_TYPES,
    USER_TYPES,
} from '@common/decorators/session.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { CreateGameDto } from './dto/create-game.dto';
import { DeleteGamesParamsDto } from './dto/delete-games-params.dto';
import { RemoveStageFromGamesParamsDto } from './dto/remove-stage-from-games-params.dto';
import { StageContentQueryDto } from './dto/stage-content-query.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { GamesService } from './games.service';

@ApiTags('Admin Games')
@ApiBearerAuth('authorization')
@RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/games')
export class GamesController {
    constructor(private readonly gamesService: GamesService) {}

    @Post()
    createGame(@Body() payload: CreateGameDto) {
        return this.gamesService.createGame(payload);
    }

    @Get()
    listGames(@Query() query: ListQueryDto) {
        return this.gamesService.listGames(query);
    }

    @Get('stage-content')
    @Public()
    getStageContent(@Query() query: StageContentQueryDto) {
        return this.gamesService.getStageContent(query);
    }

    @Get(':gameId')
    getGame(@Param('gameId') gameId: string, @Query('stage_id') stageId?: string) {
        return this.gamesService.getGame(gameId, stageId);
    }

    @Put(':gameId')
    replaceGame(@Param('gameId') gameId: string, @Body() payload: UpdateGameDto) {
        return this.gamesService.updateGame(gameId, payload);
    }

    @Patch(':gameId')
    updateGame(@Param('gameId') gameId: string, @Body() payload: UpdateGameDto) {
        return this.gamesService.updateGame(gameId, payload);
    }

    @Delete(':gameId')
    deleteGame(@Param() params: DeleteGamesParamsDto) {
        return this.gamesService.deleteGame(params.gameId);
    }

    @Get(':gameId/stages')
    listStages(@Param('gameId') gameId: string) {
        return this.gamesService.listStages(gameId);
    }

    @Delete(':gameIds/stages/:stageId')
    @ApiOperation({
        summary: 'Remove one stage from multiple games',
        description: 'Pass multiple game IDs as a comma-separated list in the gameIds path param.',
    })
    @ApiParam({
        name: 'gameIds',
        type: String,
        example: '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222',
        description: 'Comma-separated list of game IDs.',
    })
    @ApiParam({
        name: 'stageId',
        type: String,
        format: 'uuid',
        example: '33333333-3333-3333-3333-333333333333',
        description: 'Stage ID to remove from the specified games.',
    })
    removeStage(@Param() params: RemoveStageFromGamesParamsDto) {
        return this.gamesService.removeStage(params.gameIds, params.stageId);
    }
}
