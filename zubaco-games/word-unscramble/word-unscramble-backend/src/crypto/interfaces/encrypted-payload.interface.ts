export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  tag: string;
}
