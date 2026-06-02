import { Injectable, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { config } from '@config';
import { TOKEN_EXPIRY, USER_TYPES } from '../../common/constants';
import { generateLoginToken } from '../../common/utils/token.util';

export interface DevSessionResult {
    token: string;
    expiresAt: string;
    stageId: string;
    user: { id: string; name: string };
}

@Injectable()
export class DevAuthService {
    createDevSession(stageId: string): DevSessionResult {
        if (config.nodeEnv === 'production') {
            throw new ForbiddenException('Dev sessions are not available in production');
        }

        const userId = randomUUID();
        const sessionId = randomUUID();
        const token = generateLoginToken(userId, USER_TYPES.USER, sessionId);

        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.LOGIN * 1000).toISOString();

        return {
            token,
            expiresAt,
            stageId,
            user: { id: userId, name: `Dev User ${userId.slice(0, 6)}` },
        };
    }
}
