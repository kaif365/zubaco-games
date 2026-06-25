import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@config';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface PresignedUpload {
    /** The S3 object key the asset will live at. */
    key: string;
    /** Presigned PUT URL the client uploads the file bytes to. */
    uploadUrl: string;
    /** Public URL the asset is served from once uploaded. */
    publicUrl: string;
    /** Seconds until the upload URL expires. */
    expiresIn: number;
}

/** Asset categories that map to dedicated key prefixes in the bucket. */
export type AssetCategory = 'spot-diff' | 'sliding-puzzle';

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class S3Service {
    private readonly logger = new Logger(S3Service.name);
    private readonly client = new S3Client({
        region: config.aws.region,
        credentials: {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
        },
    });
    private readonly bucket = config.aws.s3.assetsBucket;

    /**
     * Issue a presigned PUT URL for an admin to upload a game asset image
     * directly to S3. Validates content type and size up front so we never
     * mint URLs for disallowed files.
     */
    async createPresignedUpload(input: {
        category: AssetCategory;
        gameId: string;
        contentType: string;
        contentLength?: number;
    }): Promise<PresignedUpload> {
        const ext = ALLOWED_CONTENT_TYPES[input.contentType?.toLowerCase()];
        if (!ext) {
            throw new BadRequestException(
                `Unsupported content type. Allowed: ${Object.keys(ALLOWED_CONTENT_TYPES).join(', ')}`,
            );
        }
        if (input.contentLength !== undefined && input.contentLength > MAX_UPLOAD_BYTES) {
            throw new BadRequestException(`File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit`);
        }

        const key = `games/${input.category}/${this.sanitize(input.gameId)}/${randomUUID()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: input.contentType,
            // Block public-write; objects are served via CDN / bucket policy.
            ...(input.contentLength !== undefined ? { ContentLength: input.contentLength } : {}),
        });

        const expiresIn = config.aws.s3.uploadUrlTtlSeconds;
        const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

        return {
            key,
            uploadUrl,
            publicUrl: this.publicUrl(key),
            expiresIn,
        };
    }

    /** Build the public URL for a stored object key. */
    publicUrl(key: string): string {
        const base = config.aws.s3.publicBaseUrl
            ? config.aws.s3.publicBaseUrl.replace(/\/+$/, '')
            : `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com`;
        return `${base}/${key}`;
    }

    /** Presigned GET URL for reading a private asset (admin preview). */
    async createPresignedDownload(key: string, expiresIn = 300): Promise<string> {
        return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
            expiresIn,
        });
    }

    /** Delete an asset object (e.g. when replacing or removing game content). */
    async deleteObject(key: string): Promise<void> {
        try {
            await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        } catch (err) {
            this.logger.warn(`Failed to delete S3 object ${key}: ${(err as Error).message}`);
        }
    }

    private sanitize(value: string): string {
        return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
    }
}
