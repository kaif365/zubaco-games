import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { config } from '@config';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

import type { EncryptedPayload } from './interfaces/encrypted-payload.interface';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;

@Injectable()
export class CryptoService {
    private readonly logger = new Logger(CryptoService.name);
    private readonly key: Buffer | null;

    constructor() {
        this.key = config.crypto.encryptionKey ? this.parseKey(config.crypto.encryptionKey) : null;
    }

    /**
     * Checks whether enabled.
     *
     * @returns {boolean} The result of isEnabled.
     */
    isEnabled(): boolean {
        return config.crypto.enabled && !!this.key;
    }

    /**
     * Encrypt.
     *
     * @param {T} data - The data.
     *
     * @returns {EncryptedPayload} The result of encrypt.
     */
    encrypt<T>(data: T): EncryptedPayload {
        try {
            const key = this.requireKey();
            const iv = randomBytes(IV_LENGTH_BYTES);
            const cipher = createCipheriv(ALGORITHM, key, iv);
            const plaintext = JSON.stringify(data);

            const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
            const tag = cipher.getAuthTag();

            return {
                iv: iv.toString('base64'),
                ciphertext: encrypted.toString('base64'),
                tag: tag.toString('base64'),
            };
        } catch (error) {
            this.logger.error(
                'Encryption failed',
                error instanceof Error ? error.stack : undefined,
            );
            throw new InternalServerErrorException('ENCRYPTION_FAILED');
        }
    }

    /**
     * Decrypt.
     *
     * @param {EncryptedPayload} payload - Request payload.
     * @param {string} payload.iv - The iv.
     * @param {string} payload.ciphertext - The ciphertext.
     * @param {string} payload.tag - The tag.
     *
     * @returns {T} The result of decrypt.
     */
    decrypt<T = unknown>(payload: EncryptedPayload): T {
        try {
            const key = this.requireKey();
            this.assertPayloadShape(payload);

            const iv = Buffer.from(payload.iv, 'base64');
            const ciphertext = Buffer.from(payload.ciphertext, 'base64');
            const tag = Buffer.from(payload.tag, 'base64');

            if (iv.length !== IV_LENGTH_BYTES) {
                throw new Error('INVALID_IV_LENGTH');
            }

            const decipher = createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(tag);

            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

            return JSON.parse(decrypted.toString('utf8')) as T;
        } catch (error) {
            this.logger.warn(
                `Decryption failed: ${error instanceof Error ? error.message : 'unknown error'}`,
            );
            throw error;
        }
    }

    /**
     * Checks whether encrypted payload.
     *
     * @param {unknown} payload - Request payload.
     *
     * @returns {boolean} The result of isEncryptedPayload.
     */
    isEncryptedPayload(payload: unknown): payload is EncryptedPayload {
        return (
            !!payload &&
            typeof payload === 'object' &&
            typeof (payload as EncryptedPayload).iv === 'string' &&
            typeof (payload as EncryptedPayload).ciphertext === 'string' &&
            typeof (payload as EncryptedPayload).tag === 'string'
        );
    }

    /**
     * Has encryption fields.
     *
     * @param {unknown} payload - Request payload.
     *
     * @returns {boolean} The result of hasEncryptionFields.
     */
    hasEncryptionFields(payload: unknown): boolean {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        const obj = payload as Record<string, unknown>;
        return 'iv' in obj || 'ciphertext' in obj || 'tag' in obj;
    }

    /**
     * Parse key.
     *
     * @param {string} keyHex - The key hex.
     *
     * @returns {Buffer} The result of parseKey.
     */
    private parseKey(keyHex: string): Buffer {
        if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
            throw new Error('ENCRYPTION_KEY must be a hex string');
        }

        const key = Buffer.from(keyHex, 'hex');
        if (key.length !== KEY_LENGTH_BYTES) {
            throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
        }

        return key;
    }

    /**
     * Require key.
     *
     * @returns {Buffer} The result of requireKey.
     */
    private requireKey(): Buffer {
        if (!this.key) {
            throw new InternalServerErrorException('ENCRYPTION_KEY_MISSING');
        }

        return this.key;
    }

    /**
     * Assert payload shape.
     *
     * @param {EncryptedPayload} payload - Request payload.
     * @param {string} payload.iv - The iv.
     * @param {string} payload.ciphertext - The ciphertext.
     * @param {string} payload.tag - The tag.
     *
     * @returns {void} No return value.
     */
    private assertPayloadShape(payload: EncryptedPayload): void {
        if (
            !payload ||
            typeof payload.iv !== 'string' ||
            typeof payload.ciphertext !== 'string' ||
            typeof payload.tag !== 'string'
        ) {
            throw new Error('INVALID_ENCRYPTED_PAYLOAD');
        }
    }
}
