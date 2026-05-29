import { SetMetadata } from '@nestjs/common';

export const SKIP_ENCRYPTION_METADATA_KEY = 'skip_encryption';

export const SkipEncryption = () => SetMetadata(SKIP_ENCRYPTION_METADATA_KEY, true);
