import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { AddStageToTournamentDto } from './dto/add-stage-to-tournament.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { DeleteTournamentsDto } from './dto/delete-tournaments.dto';
import { RemoveStagesFromTournamentParamsDto } from './dto/remove-stages-from-tournament-params.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsService } from './tournaments.service';

@ApiTags('Admin Tournaments')
@ApiBearerAuth('authorization')
@RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/tournaments')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) {}

    @Post('stages')
    @ApiOperation({
        summary: 'Attach multiple stages to one tournament',
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['tournament_id', 'stage_ids'],
            properties: {
                tournament_id: {
                    type: 'string',
                    format: 'uuid',
                    example: '44444444-4444-4444-4444-444444444444',
                },
                stage_ids: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'uuid',
                    },
                    example: [
                        '33333333-3333-3333-3333-333333333333',
                        '55555555-5555-5555-5555-555555555555',
                    ],
                },
            },
        },
    })
    addStageToTournament(@Body() payload: AddStageToTournamentDto) {
        return this.tournamentsService.addStageToTournament(payload);
    }

    @Post()
    createTournament(@Body() payload: CreateTournamentDto) {
        return this.tournamentsService.createTournament(payload);
    }

    @Get()
    listTournaments(@Query() query: ListQueryDto) {
        return this.tournamentsService.listTournaments(query);
    }

    @Get(':tournamentId')
    getTournament(@Param('tournamentId') tournamentId: string) {
        return this.tournamentsService.getTournament(tournamentId);
    }

    @Put(':tournamentId')
    updateTournament(
        @Param('tournamentId') tournamentId: string,
        @Body() payload: UpdateTournamentDto,
    ) {
        return this.tournamentsService.updateTournament(tournamentId, payload);
    }

    @Delete()
    deleteTournament(@Body() payload: DeleteTournamentsDto) {
        return this.tournamentsService.deleteTournament(payload.tournamentIds);
    }

    @Get(':tournamentId/stages')
    listStages(@Param('tournamentId') tournamentId: string, @Query() query: ListQueryDto) {
        return this.tournamentsService.listStages(tournamentId, query);
    }

    @Delete(':tournamentId/stages/:stageIds')
    @ApiOperation({
        summary: 'Remove multiple stages from one tournament',
        description:
            'Pass multiple stage IDs as a comma-separated list in the stageIds path param.',
    })
    @ApiParam({
        name: 'tournamentId',
        type: String,
        format: 'uuid',
        example: '44444444-4444-4444-4444-444444444444',
        description: 'Tournament ID.',
    })
    @ApiParam({
        name: 'stageIds',
        type: String,
        example: '33333333-3333-3333-3333-333333333333,55555555-5555-5555-5555-555555555555',
        description: 'Comma-separated list of stage IDs.',
    })
    removeStage(@Param() params: RemoveStagesFromTournamentParamsDto) {
        return this.tournamentsService.removeStage(params.tournamentId, params.stageIds);
    }
}
