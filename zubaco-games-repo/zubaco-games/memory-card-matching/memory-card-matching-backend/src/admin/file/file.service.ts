import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { S3StorageService } from "@aws/s3-storage.service";
import {
  ERROR_CODES,
  IMAGE_COMPRESSION_CONFIG,
  IMAGE_MIME_TYPES,
} from "@common/constants";
import { PrismaService } from "@common/prisma/prisma.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import sharp from "sharp";

interface OptimizedImage {
  buffer: Buffer;
  fileSize: number;
  mimeType: string;
}

/**
 * Handles image optimization and storage for admin uploads.
 */
@Injectable()
export class FileService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   * @param {S3StorageService} s3StorageService - s3 storage service value.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  /**
   * Handle upload many.
   *
   * @param {Express.Multer.File[]} files - files value.
   * @param {string} adminId - admin id value.
   *
   * @returns {Promise<{ files: Array<{ key: string; fileName: string }> }>} The asynchronous result.
   */
  async uploadMany(
    files: Express.Multer.File[],
    adminId: string,
  ): Promise<{ files: Array<{ key: string; fileName: string }> }> {
    const uploadedFiles = await Promise.all(
      files.map((file) => this.uploadSingle(file, adminId)),
    );

    return {
      files: uploadedFiles,
    };
  }

  /**
   * Handle upload single.
   *
   * @param {Express.Multer.File} file - file value.
   * @param {string} adminId - admin id value.
   *
   * @returns {Promise<{ key: string; fileName: string }>} The asynchronous result.
   */
  private async uploadSingle(
    file: Express.Multer.File,
    adminId: string,
  ): Promise<{ key: string; fileName: string }> {
    const extension = extname(file.originalname).toLowerCase();
    const key = `uploads/${Date.now()}-${randomUUID()}${extension}`;
    const optimizedImage = await this.compressImage(file);

    await this.s3StorageService.uploadObject({
      key,
      body: optimizedImage.buffer,
      contentType: optimizedImage.mimeType,
    });

    await this.prisma.file.create({
      data: {
        adminId,
        key,
        fileName: file.originalname,
        fileSize: optimizedImage.fileSize,
        mimeType: optimizedImage.mimeType,
      },
    });

    return { key, fileName: file.originalname };
  }

  /**
   * Handle compress image.
   *
   * @param {Express.Multer.File} file - file value.
   *
   * @returns {Promise<OptimizedImage>} The asynchronous result.
   */
  private async compressImage(
    file: Express.Multer.File,
  ): Promise<OptimizedImage> {
    try {
      const image = sharp(file.buffer, { failOn: "error" });
      let compressedBuffer: Buffer;

      switch (file.mimetype) {
        case IMAGE_MIME_TYPES.JPEG:
          compressedBuffer = await image
            .jpeg({
              quality: IMAGE_COMPRESSION_CONFIG.JPEG_QUALITY,
              progressive: true,
            })
            .toBuffer();
          break;
        case IMAGE_MIME_TYPES.PNG:
          compressedBuffer = await image
            .png({
              compressionLevel: IMAGE_COMPRESSION_CONFIG.PNG_COMPRESSION_LEVEL,
            })
            .toBuffer();
          break;
        case IMAGE_MIME_TYPES.WEBP:
          compressedBuffer = await image
            .webp({ quality: IMAGE_COMPRESSION_CONFIG.WEBP_QUALITY })
            .toBuffer();
          break;
        default:
          return {
            buffer: file.buffer,
            fileSize: file.size,
            mimeType: file.mimetype,
          };
      }

      const finalBuffer =
        compressedBuffer.length < file.buffer.length
          ? compressedBuffer
          : file.buffer;

      return {
        buffer: finalBuffer,
        fileSize: finalBuffer.length,
        mimeType: file.mimetype,
      };
    } catch {
      throw new BadRequestException({
        error: ERROR_CODES.INVALID_IMAGE_FILE,
        message: "The uploaded file could not be processed as an image",
      });
    }
  }
}
