import { SetMetadata } from '@nestjs/common';

export const ENABLE_ENCRYPTION_METADATA_KEY = 'enable_encryption';

/**
 * Handle enable encryption.
 *
 * @returns {CustomDecorator<string>} The enable encryption result.
 */
export const EnableEncryption = () => SetMetadata(ENABLE_ENCRYPTION_METADATA_KEY, true);
