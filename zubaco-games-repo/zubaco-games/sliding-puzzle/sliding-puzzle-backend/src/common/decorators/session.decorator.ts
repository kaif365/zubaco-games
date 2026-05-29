import { SetMetadata } from '@nestjs/common';

import type { AuthType, TokenType, UserType } from '../constants';
import { TOKEN_TYPES, USER_TYPES } from '../constants';

export const SESSION_METADATA_KEY = 'session_requirements';

export interface SessionRequirements {
    tokenTypes: TokenType[];
    userTypes: Array<UserType | AuthType>;
}

/**
 * Handle require session.
 *
 * @param {SessionRequirements} requirements - requirements value.
 *
 * @returns {CustomDecorator<string>} The require session result.
 */
export const RequireSession = (requirements: SessionRequirements) =>
    SetMetadata(SESSION_METADATA_KEY, requirements);

export { TOKEN_TYPES, USER_TYPES };
