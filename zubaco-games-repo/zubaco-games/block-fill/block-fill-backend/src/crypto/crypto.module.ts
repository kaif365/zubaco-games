import { Module } from '@nestjs/common';

import { CryptoService } from './crypto.service';
import { EncryptionInterceptor } from './encryption.interceptor';

@Module({
    providers: [CryptoService, EncryptionInterceptor],
    exports: [CryptoService, EncryptionInterceptor],
})
export class CryptoModule {}
