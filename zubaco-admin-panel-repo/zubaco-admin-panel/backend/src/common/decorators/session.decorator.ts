import { SetMetadata } from '@nestjs/common';

import type { TokenType, UserType } from '../constants';
import { TOKEN_TYPES, USER_TYPES } from '../constants';

export const SESSION_METADATA_KEY = 'session_requirements';
export const PUBLIC_ROUTE_KEY = 'is_public_route';

export interface SessionRequirements {
    tokenTypes: TokenType[];
    userTypes: UserType[];
}

/**
 * Require a valid session on an HTTP route.
 * Session is validated against Redis — no DB lookup for session.
 *
 * @example
 * @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
 */
export const RequireSession = (requirements: SessionRequirements) =>
    SetMetadata(SESSION_METADATA_KEY, requirements);

/** Mark a route as public — bypasses session guard even if the controller requires auth. */
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

export { TOKEN_TYPES, USER_TYPES };
