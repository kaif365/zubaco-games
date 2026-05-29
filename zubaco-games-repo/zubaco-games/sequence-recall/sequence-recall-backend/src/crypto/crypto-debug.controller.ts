import { TOKEN_TYPES, USER_TYPES } from '@common/constants';
import { RequireSession } from '@common/decorators/session.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CryptoService } from './crypto.service';
import type { EncryptedPayload } from './interfaces/encrypted-payload.interface';
import { SkipEncryption } from './skip-encryption.decorator';

@ApiTags('Crypto Debug')
@Controller('v1/crypto/debug')
export class CryptoDebugController {
    constructor(private readonly cryptoService: CryptoService) {}

    /**
     * Decrypt payload.
     *
     * @param {EncryptedPayload} payload - Request payload.
     * @param {string} payload.iv - The iv.
     * @param {string} payload.ciphertext - The ciphertext.
     * @param {string} payload.tag - The tag.
     *
     * @returns {{ decrypted: unknown; }} The result of decryptPayload.
     */
    @Post('decrypt')
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    decryptPayload(@Body() payload: EncryptedPayload) {
        return {
            decrypted: this.cryptoService.decrypt(payload),
        };
    }
}
