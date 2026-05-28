import { SetMetadata } from '@nestjs/common';

import type { TokenType, UserType, AuthType } from '../constants';
import { TOKEN_TYPES, USER_TYPES } from '../constants';

export const SESSION_METADATA_KEY = 'session_requirements';

export interface SessionRequirements {
    tokenTypes: TokenType[];
    userTypes: (UserType | AuthType)[];
}

/**
 * Require session.
 *
 * @param {SessionRequirements} requirements - The requirements.
 *
 * @returns {MethodDecorator & ClassDecorator & { KEY: string; }} The result of RequireSession.
 */
export const RequireSession = (requirements: SessionRequirements) =>
    SetMetadata(SESSION_METADATA_KEY, requirements);

export { TOKEN_TYPES, USER_TYPES };
