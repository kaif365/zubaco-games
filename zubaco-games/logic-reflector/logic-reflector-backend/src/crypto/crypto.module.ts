import { Module } from "@nestjs/common";

import { CryptoService } from "./crypto.service";
import { DecryptionMiddleware } from "./decryption.middleware";
import { EncryptionInterceptor } from "./encryption.interceptor";

@Module({
  providers: [CryptoService, EncryptionInterceptor, DecryptionMiddleware],
  exports: [CryptoService, EncryptionInterceptor, DecryptionMiddleware],
})
export class CryptoModule {}
