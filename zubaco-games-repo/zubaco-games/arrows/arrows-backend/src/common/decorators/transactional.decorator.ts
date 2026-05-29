import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for transactional decorator
 */
export const TRANSACTIONAL_KEY = 'TRANSACTIONAL';

/**
 * Transactional decorator options
 */
export interface TransactionalOptions {
    /**
     * If true, uses RepeatableRead isolation for consistent reads.
     * Default: false (uses ReadCommitted — PostgreSQL default).
     */
    readOnly?: boolean;
}

/**
 * Handle transactional.
 *
 * @param {TransactionalOptions} options - options value.
 *
 * @returns {CustomDecorator<string>} The transactional result.
 */
export const Transactional = (options: TransactionalOptions = {}) =>
    SetMetadata(TRANSACTIONAL_KEY, options);
