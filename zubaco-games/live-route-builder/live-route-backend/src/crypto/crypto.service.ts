import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { EncryptedPayload } from './interfaces/encrypted-payload.interface';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer | null;

  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY || '';
    this.key = keyHex ? this.parseKey(keyHex) : null;
  }

  isEnabled(): boolean {
    return process.env.ENCRYPTION_ENABLED !== 'false' && !!this.key;
  }

  encrypt(data: unknown): EncryptedPayload {
    const key = this.requireKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const plaintext = JSON.stringify(data);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  decrypt(payload: unknown): unknown {
    const key = this.requireKey();
    this.assertPayloadShape(payload);

    const typed = payload as EncryptedPayload;
    const iv = Buffer.from(typed.iv, 'base64');
    const ciphertext = Buffer.from(typed.ciphertext, 'base64');
    const tag = Buffer.from(typed.tag, 'base64');

    if (iv.length !== IV_LENGTH) throw new Error('INVALID_IV_LENGTH');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  isEncryptedPayload(payload: unknown): payload is EncryptedPayload {
    return (
      !!payload &&
      typeof payload === 'object' &&
      typeof (payload as EncryptedPayload).iv === 'string' &&
      typeof (payload as EncryptedPayload).ciphertext === 'string' &&
      typeof (payload as EncryptedPayload).tag === 'string'
    );
  }

  hasEncryptionFields(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') return false;
    const obj = payload as Record<string, unknown>;
    return 'iv' in obj || 'ciphertext' in obj || 'tag' in obj;
  }

  private parseKey(keyHex: string): Buffer | null {
    if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
      this.logger.warn('ENCRYPTION_KEY is not a valid hex string');
      return null;
    }
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== KEY_LENGTH) {
      this.logger.warn('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
      return null;
    }
    return key;
  }

  private requireKey(): Buffer {
    if (!this.key) throw new InternalServerErrorException('ENCRYPTION_KEY_MISSING');
    return this.key;
  }

  private assertPayloadShape(payload: unknown): asserts payload is EncryptedPayload {
    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof (payload as EncryptedPayload).iv !== 'string' ||
      typeof (payload as EncryptedPayload).ciphertext !== 'string' ||
      typeof (payload as EncryptedPayload).tag !== 'string'
    ) {
      throw new Error('INVALID_ENCRYPTED_PAYLOAD');
    }
  }
}
