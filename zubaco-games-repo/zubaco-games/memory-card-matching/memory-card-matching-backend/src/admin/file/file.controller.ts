import { STATUS_CODES } from "@common/constants";
import { CurrentAdmin } from "@common/decorators/current-admin.decorator";
import { AdminAuthGuard } from "@common/guards/admin-auth.guard";
import { config } from "@config";
import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";

import { FileService } from "./file.service";

const MAX_UPLOAD_FILE_COUNT = 20;

/**
 * Create upload options for in-memory file handling.
 *
 * @returns {{ storage: ReturnType<typeof memoryStorage>; limits: { fileSize: number } }} The multer upload options.
 */
function createUploadOptions() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: config.upload.maxFileSizeBytes },
  };
}

/**
 * Controller for admin-managed file uploads.
 */
@ApiTags("Admin - Files")
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller("files")
export class FileController {
  /**
   * Create a new instance.
   *
   * @param {FileService} fileService - file service value.
   */
  constructor(private readonly fileService: FileService) {}

  /**
   * Handle upload.
   *
   * @param {Express.Multer.File[] | undefined} files - files value.
   * @param {{ id: string } | undefined} admin - admin value.
   *
   * @returns {Promise<{ files: Array<{ key: string; fileName: string }> }>} The asynchronous result.
   */
  @Post("upload")
  @HttpCode(STATUS_CODES.CREATED)
  @ApiOperation({
    summary: "Upload one or more image files for level configuration",
  })
  @UseInterceptors(
    FilesInterceptor("files", MAX_UPLOAD_FILE_COUNT, createUploadOptions()),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["files"],
      properties: {
        files: {
          type: "array",
          description: "Multiple image files to upload in one request",
          items: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
  })
  upload(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentAdmin() admin: { id: string } | undefined,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException({
        error: "FILE_REQUIRED",
        message: "At least one file is required in the files field",
      });
    }

    const unsupportedFile = files.find(
      (file) => !config.upload.allowedMimeTypes.includes(file.mimetype),
    );

    if (unsupportedFile) {
      throw new BadRequestException({
        error: "UNSUPPORTED_FILE_TYPE",
        message: "Unsupported file type",
      });
    }

    return this.fileService.uploadMany(files, admin?.id ?? "unknown-admin");
  }
}
