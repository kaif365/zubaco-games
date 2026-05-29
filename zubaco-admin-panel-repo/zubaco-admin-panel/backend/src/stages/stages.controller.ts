import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AddGameToStageDto } from './dto/add-game-to-stage.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { DeleteStagesParamsDto } from './dto/delete-stages-params.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StagesService } from './stages.service';

@ApiTags('Admin Stages')
@ApiBearerAuth('authorization')
@RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/stages')
export class StagesController {
    constructor(private readonly stagesService: StagesService) {}

    @Post('games')
    @ApiOperation({
        summary: 'Attach multiple games to one stage',
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['stage_id', 'game_ids'],
            properties: {
                stage_id: {
                    type: 'string',
                    format: 'uuid',
                    example: '33333333-3333-3333-3333-333333333333',
                },
                game_ids: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'uuid',
                    },
                    example: [
                        '11111111-1111-1111-1111-111111111111',
                        '22222222-2222-2222-2222-222222222222',
                    ],
                },
            },
        },
    })
    addGameToStage(@Body() payload: AddGameToStageDto) {
        return this.stagesService.addGameToStage(payload);
    }

    @Post()
    createStage(@Body() payload: CreateStageDto) {
        return this.stagesService.createStage(payload);
    }

    @Get()
    listStages(@Query() query: ListQueryDto) {
        return this.stagesService.listStages(query);
    }

    @Get(':stageId')
    getStage(@Param('stageId') stageId: string) {
        return this.stagesService.getStage(stageId);
    }

    @Put(':stageId')
    updateStage(@Param('stageId') stageId: string, @Body() payload: UpdateStageDto) {
        return this.stagesService.updateStage(stageId, payload);
    }

    @Delete(':stageId')
    deleteStage(@Param() params: DeleteStagesParamsDto) {
        return this.stagesService.deleteStage(params.stageId);
    }

    @Get(':stageId/games')
    getStageGames(@Param('stageId') stageId: string, @Query() query: ListQueryDto) {
        return this.stagesService.getStageGames(stageId, query);
    }
}
