import { TOKEN_TYPES, USER_TYPES, STATUS_CODES } from '@common/constants';
import { RequireSession } from '@common/decorators/session.decorator';
import { SessionGuard } from '@common/guards/session.guard';
import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Query,
    HttpCode,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { SkipEncryption } from '../../crypto/skip-encryption.decorator';

import { ConfigService } from './config.service';
import { DeleteConfigsDto } from './dto/delete-configs.dto';
import { UpsertConfigDto } from './dto/upsert-config.dto';

@ApiTags('Admin - Stage Configs')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('v1/stage-configs')
export class ConfigController {
    constructor(private readonly configService: ConfigService) {}

    /**
     * Upsert.
     *
     * @param {UpsertConfigDto} dto - Data transfer object.
     * @param {string} dto.stageId - The stage id.
     * @param {number} dto.timeLimit - The time limit.
     * @param {number} dto.minSequence - The min sequence.
     * @param {number} dto.maxSequence - The max sequence.
     * @param {number | undefined} [dto.demoMinSequence] - The demo min sequence.
     * @param {boolean | undefined} [dto.enableDemo] - The enable demo.
     * @param {number | undefined} [dto.demoMaxSequence] - The demo max sequence.
     * @param {number} dto.flashDelay - The flash delay.
     * @param {number | undefined} [dto.bonusTimeRatio] - The bonus time ratio.
     * @param {number | undefined} [dto.cellCount] - The cell count.
     * @param {number} dto.scorePerClick - The score per click.
     * @param {number | undefined} [dto.wrongMoveHandling] - The wrong move handling.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    @Put()
    @HttpCode(STATUS_CODES.OK)
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    upsert(@Body() dto: UpsertConfigDto) {
        return this.configService.upsert(dto);
    }

    /**
     * Remove.
     *
     * @param {DeleteConfigsDto} dto - Data transfer object.
     * @param {string[]} dto.stageIds - The stage ids.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    @Delete()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    remove(@Body() dto: DeleteConfigsDto) {
        return this.configService.remove(dto.stageIds);
    }

    /**
     * List.
     *
     * @param {string | undefined} stageId - The stage id.
     * @param {number} skip - The skip.
     * @param {number} limit - The limit.
     *
     * @returns {Promise<{ data: { id: string; stageId: string; cellCount: number; timeLimit: number; minSequence: number; maxSequence: number; enableDemo: boolean; demoMinSequence: number; demoMaxSequence: number; flashDelay: number; bonusTimeRatio: number; scorePerClick: number; wrongMoveHandling: number; createdAt: Date; }[]; totalCount: number; }>} A promise that resolves with the result.
     */
    @Get()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @ApiQuery({ name: 'stageId', required: false, type: String })
    @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    list(
        @Query('stageId') stageId?: string,
        @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    ) {
        return this.configService.listConfigs(stageId, skip, limit);
    }
}
