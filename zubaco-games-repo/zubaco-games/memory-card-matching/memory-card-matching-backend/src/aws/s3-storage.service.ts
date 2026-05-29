import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "@config";
import { Injectable, InternalServerErrorException } from "@nestjs/common";

/**
 * Handles object uploads to S3 for admin-managed assets.
 */
@Injectable()
export class S3StorageService {
  private readonly client = new S3Client({
    region: config.aws.region,
  });

  /**
   * Handle upload object.
   *
   * @param {{ key: string; body: Buffer; contentType: string; }} params - params value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async uploadObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: config.aws.s3.bucketName,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
        }),
      );
    } catch {
      throw new InternalServerErrorException({
        error: "FILE_UPLOAD_FAILED",
        message: "Failed to upload file",
      });
    }
  }
}
