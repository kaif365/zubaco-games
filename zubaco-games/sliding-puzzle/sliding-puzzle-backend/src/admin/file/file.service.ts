import { randomUUID } from 'crypto';
import { extname } from 'path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '@common/config/env.config';
import { PrismaService } from '@common/prisma/prisma.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class FileService {
    private readonly s3 = new S3Client({
        region: config.aws.region,
    });

    /**
     * Create a new instance.
     *
     * @param {PrismaService} prisma - prisma value.
     */
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Upload a file and persist its metadata.
     *
     * @param {Express.Multer.File} file - file value.
     *
     * @returns {Promise<{ key: string }>} The asynchronous result.
     */
    async upload(file: Express.Multer.File): Promise<{ key: string }> {
        const ext = extname(file.originalname).toLowerCase();
        const key = `uploads/sliding-puzzle/${Date.now()}-${randomUUID()}${ext}`;

        try {
            await this.s3.send(
                new PutObjectCommand({
                    Bucket: config.aws.s3.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }),
            );
        } catch {
            throw new InternalServerErrorException('FILE_UPLOAD_FAILED');
        }

        await this.prisma.file.create({
            data: {
                key,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
            },
        });

        return { key };
    }
}
