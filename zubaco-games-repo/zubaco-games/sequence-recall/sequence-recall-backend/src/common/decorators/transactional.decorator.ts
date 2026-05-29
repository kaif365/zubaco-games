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
 * Transactional.
 *
 * @param {TransactionalOptions} options - Function options.
 * @param {boolean | undefined} [options.readOnly] - The read only.
 *
 * @returns {MethodDecorator & ClassDecorator & { KEY: string; }} The result of Transactional.
 */
export const Transactional = (options: TransactionalOptions = {}) =>
    SetMetadata(TRANSACTIONAL_KEY, options);
