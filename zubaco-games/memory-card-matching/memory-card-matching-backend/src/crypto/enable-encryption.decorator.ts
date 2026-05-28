import { SetMetadata } from "@nestjs/common";

export const ENABLE_ENCRYPTION_METADATA_KEY = "enable_encryption";

export const EnableEncryption = () =>
  SetMetadata(ENABLE_ENCRYPTION_METADATA_KEY, true);
