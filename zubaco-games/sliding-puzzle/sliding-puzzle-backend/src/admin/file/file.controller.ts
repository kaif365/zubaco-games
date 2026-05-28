import { config } from '@common/config/env.config';
import { STATUS_CODES } from '@common/constants';
import { ApiKeyGuard } from '@common/guards/api-key.guard';
import {
    Controller,
    Post,
    HttpCode,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiSecurity, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { FileService } from './file.service';

@ApiTags('Admin — Files')
@ApiSecurity('X-API-KEY')
@UseGuards(ApiKeyGuard)
@Controller('v1/files')
export class FileController {
    /**
     * Create a new instance.
     *
     * @param {FileService} fileService - file service value.
     */
    constructor(private readonly fileService: FileService) {}

    /**
     * Upload a file.
     *
     * @param {Express.Multer.File} file - file value.
     *
     * @returns {Promise<{ key: string }>} The asynchronous result.
     */
    @Post('upload')
    @HttpCode(STATUS_CODES.CREATED)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: config.upload.maxFileSizeBytes },
            fileFilter: (_req, file, cb) => {
                if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('UNSUPPORTED_FILE_TYPE'), false);
                }
            },
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    upload(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('FILE_REQUIRED');
        }
        return this.fileService.upload(file);
    }
}
