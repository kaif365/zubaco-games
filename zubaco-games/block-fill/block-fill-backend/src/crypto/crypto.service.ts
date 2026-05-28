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
     * Checks whether payload encryption is enabled and ready to use.
     * @returns {boolean} Whether encryption is enabled and a valid key is available.
     */
    isEnabled(): boolean {
        return config.crypto.enabled && !!this.key;
    }

    /**
     * Encrypts a response payload into the transport-safe encrypted envelope.
     * @param {unknown} data - The response payload to encrypt.
     * @returns {EncryptedPayload} The encrypted payload containing iv, ciphertext, and tag.
     */
    encrypt(data: any): EncryptedPayload {
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
     * Decrypts an encrypted payload back into its original JSON value.
     * @param {EncryptedPayload} payload - The encrypted payload received from the client.
     * @returns {unknown} The decrypted payload content.
     */
    decrypt(payload: EncryptedPayload): any {
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

            return JSON.parse(decrypted.toString('utf8'));
        } catch (error) {
            this.logger.warn(
                `Decryption failed: ${error instanceof Error ? error.message : 'unknown error'}`,
            );
            throw error;
        }
    }

    /**
     * Checks whether a value matches the encrypted payload contract.
     * @param {unknown} payload - The incoming value to inspect.
     * @returns {boolean} Whether the value is a valid encrypted payload.
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
     * Checks whether a payload contains any encryption-related fields.
     * @param {unknown} payload - The incoming request payload to inspect.
     * @returns {boolean} Whether the payload contains iv, ciphertext, or tag fields.
     */
    hasEncryptionFields(payload: unknown): boolean {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        const obj = payload as Record<string, unknown>;
        return 'iv' in obj || 'ciphertext' in obj || 'tag' in obj;
    }

    /**
     * Parses and validates the configured encryption key.
     * @param {string} keyHex - The hexadecimal encryption key from configuration.
     * @returns {Buffer} The validated binary encryption key.
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
     * Returns the configured encryption key or throws when encryption is misconfigured.
     * @returns {Buffer} The active encryption key.
     */
    private requireKey(): Buffer {
        if (!this.key) {
            throw new InternalServerErrorException('ENCRYPTION_KEY_MISSING');
        }

        return this.key;
    }

    /**
     * Validates the encrypted payload structure before decryption.
     * @param {EncryptedPayload} payload - The encrypted payload to validate.
     * @returns {void} Nothing.
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
