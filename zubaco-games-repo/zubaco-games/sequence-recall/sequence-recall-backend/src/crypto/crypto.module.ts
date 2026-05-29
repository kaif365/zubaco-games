import { Module } from '@nestjs/common';

import { CryptoDebugController } from './crypto-debug.controller';
import { CryptoService } from './crypto.service';
import { EncryptionInterceptor } from './encryption.interceptor';

@Module({
    controllers: [CryptoDebugController],
    providers: [CryptoService, EncryptionInterceptor],
    exports: [CryptoService, EncryptionInterceptor],
})
export class CryptoModule {}
