import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { CRYPTO_CONFIGS } from "@common/constants";
import { config } from "@config";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import type { EncryptedPayload } from "./interfaces/encrypted-payload.interface";

/**
 * Handles request and response payload encryption for gameplay endpoints.
 */
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
   * Check whether payload encryption is enabled and usable.
   *
   * @returns {boolean} Whether encryption is enabled.
   */
  isEnabled(): boolean {
    return config.crypto.enabled && !!this.key;
  }

  /**
   * Handle encrypt.
   *
   * @param {unknown} data - data value.
   *
   * @returns {EncryptedPayload} The encrypted payload result.
   */
  encrypt(data: unknown): EncryptedPayload {
    try {
      const key = this.requireKey();
      const iv = randomBytes(CRYPTO_CONFIGS.IV_LENGTH_BYTES);
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
   * @returns {unknown} The decrypted payload result.
   */
  decrypt(payload: EncryptedPayload): unknown {
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
   * Check whether a payload matches the encrypted request shape.
   *
   * @param {unknown} payload - payload value.
   *
   * @returns {payload is EncryptedPayload} Whether the payload is encrypted.
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
   * Check whether a payload includes any encryption marker fields.
   *
   * @param {unknown} payload - payload value.
   *
   * @returns {boolean} Whether encryption fields are present.
   */
  hasEncryptionFields(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") {
      return false;
    }

    const record = payload as Record<string, unknown>;
    return "iv" in record || "ciphertext" in record || "tag" in record;
  }

  /**
   * Parse the configured encryption key from hex.
   *
   * @param {string} keyHex - hex key value.
   *
   * @returns {Buffer} The parsed key result.
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
   * Require a parsed encryption key to be available.
   *
   * @returns {Buffer} The encryption key result.
   */
  private requireKey(): Buffer {
    if (!this.key) {
      throw new InternalServerErrorException("ENCRYPTION_KEY_MISSING");
    }

    return this.key;
  }

  /**
   * Validate the encrypted payload field shape before decryption.
   *
   * @param {EncryptedPayload} payload - payload value.
   *
   * @returns {void} Resolves when the operation completes.
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
