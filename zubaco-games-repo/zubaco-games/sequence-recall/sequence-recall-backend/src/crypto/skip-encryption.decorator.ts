import { SetMetadata } from '@nestjs/common';

export const SKIP_ENCRYPTION_METADATA_KEY = 'skip_encryption';

/**
 * Skip encryption.
 *
 * @returns {MethodDecorator & ClassDecorator & { KEY: string; }} The result of SkipEncryption.
 */
export const SkipEncryption = () => SetMetadata(SKIP_ENCRYPTION_METADATA_KEY, true);
