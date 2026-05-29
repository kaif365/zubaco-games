import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { promisify } from "util";

const randomBytesAsync = promisify(randomBytes);

import { config } from "@common/config/env.config";
import { CRYPTO_CONFIGS } from "@common/constants";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import type { EncryptedPayload } from "./interfaces/encrypted-payload.interface";

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer | null;

  /**
   * Create a new instance.
   */
  constructor() {
    this.key = config.crypto.encryptionKey
      ? this.parseKey(config.crypto.encryptionKey)
      : null;
  }

  /**
   * Check whether enabled.
   *
   * @returns {boolean} Whether the condition is met.
   */
  isEnabled(): boolean {
    return config.crypto.enabled && !!this.key;
  }

  /**
   * Handle encrypt.
   *
   * @param {any} data - data value.
   *
   * @returns {EncryptedPayload} The encrypt result.
   */
  async encrypt(data: any): Promise<EncryptedPayload> {
    try {
      const key = this.requireKey();
      const iv = await randomBytesAsync(CRYPTO_CONFIGS.IV_LENGTH_BYTES);
      const cipher = createCipheriv(CRYPTO_CONFIGS.ALGORITHM, key, iv);
      const plaintext = JSON.stringify(data);

      const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      return {
        iv: iv.toString("base64"),
        ciphertext: encrypted.toString("base64"),
        tag: tag.toString("base64"),
      };
    } catch (error) {
      this.logger.error(
        "Encryption failed",
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException("ENCRYPTION_FAILED");
    }
  }

  /**
   * Handle decrypt.
   *
   * @param {EncryptedPayload} payload - payload value.
   *
   * @returns {any} The decrypt result.
   */
  decrypt(payload: EncryptedPayload): any {
    try {
      const key = this.requireKey();
      this.assertPayloadShape(payload);

      const iv = Buffer.from(payload.iv, "base64");
      const ciphertext = Buffer.from(payload.ciphertext, "base64");
      const tag = Buffer.from(payload.tag, "base64");

      if (iv.length !== CRYPTO_CONFIGS.IV_LENGTH_BYTES) {
        throw new Error("INVALID_IV_LENGTH");
      }

      const decipher = createDecipheriv(CRYPTO_CONFIGS.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return JSON.parse(decrypted.toString("utf8"));
    } catch (error) {
      this.logger.warn(
        `Decryption failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Check whether encrypted payload.
   *
   * @param {unknown} payload - Value to check for encrypted payload fields.
   *
   * @returns {payload is EncryptedPayload} The is encrypted payload result.
   */
  isEncryptedPayload(payload: unknown): payload is EncryptedPayload {
    return (
      !!payload &&
      typeof payload === "object" &&
      typeof (payload as EncryptedPayload).iv === "string" &&
      typeof (payload as EncryptedPayload).ciphertext === "string" &&
      typeof (payload as EncryptedPayload).tag === "string"
    );
  }

  /**
   * Check whether encryption fields.
   *
   * @param {unknown} payload - Value to check for encryption field names.
   *
   * @returns {boolean} Whether the condition is met.
   */
  hasEncryptionFields(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") {
      return false;
    }
    const obj = payload as Record<string, unknown>;
    return "iv" in obj || "ciphertext" in obj || "tag" in obj;
  }

  /**
   * Handle parse key.
   *
   * @param {string} keyHex - key hex value.
   *
   * @returns {Buffer} The parse key result.
   */
  private parseKey(keyHex: string): Buffer {
    if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
      throw new Error("ENCRYPTION_KEY must be a hex string");
    }
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== CRYPTO_CONFIGS.KEY_LENGTH_BYTES) {
      throw new Error(
        "ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)",
      );
    }
    return key;
  }

  /**
   * Handle require key.
   *
   * @returns {Buffer} The require key result.
   */
  private requireKey(): Buffer {
    if (!this.key) {
      throw new InternalServerErrorException("ENCRYPTION_KEY_MISSING");
    }
    return this.key;
  }

  /**
   * Handle assert payload shape.
   *
   * @param {EncryptedPayload} payload - payload value.
   */
  private assertPayloadShape(payload: EncryptedPayload): void {
    if (
      !payload ||
      typeof payload.iv !== "string" ||
      typeof payload.ciphertext !== "string" ||
      typeof payload.tag !== "string"
    ) {
      throw new Error("INVALID_ENCRYPTED_PAYLOAD");
    }
  }
}
