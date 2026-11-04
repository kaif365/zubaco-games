import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * States and territories where real-money skill gaming is PROHIBITED in India.
 * As per state gambling enactments and High Court jurisprudence:
 * - Assam (Assam Game and Betting Act)
 * - Odisha (Orissa Prevention of Gambling Act)
 * - Telangana (Telangana Gaming Act 2017)
 * - Andhra Pradesh (AP Gaming Act amendment)
 * - Sikkim (Sikkim On-line Gaming Regulation Act - requires local license)
 * - Nagaland (Nagaland Prohibition of Gambling Act - requires local license)
 * - Arunachal Pradesh
 * - Meghalaya
 */
const BANNED_STATE_CODES = new Set([
  'AP',       // Andhra Pradesh
  'AS',       // Assam
  'TG', 'TS', // Telangana (TS official ISO, TG colloquial)
  'OR', 'OD', // Odisha (OD official ISO 3166-2:IN, OR historical)
  'SK',       // Sikkim
  'NL',       // Nagaland
  'AR',       // Arunachal Pradesh
  'MG',       // Meghalaya
]);

const BANNED_STATE_NAMES = new Set([
  'ANDHRA PRADESH',
  'ASSAM',
  'TELANGANA',
  'ODISHA',
  'ORISSA',
  'SIKKIM',
  'NAGALAND',
  'ARUNACHAL PRADESH',
  'MEGHALAYA',
]);

const BANNED_STATES = Array.from(BANNED_STATE_CODES);

@Injectable()
export class GeoFencingGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.id || request.user?.sub;

    // Check request header or body for real-time location telemetry first
    const incomingState =
      request.headers['x-user-state'] ||
      request.headers['x-client-state'] ||
      request.body?.state;

    if (incomingState && isStateBanned(String(incomingState))) {
      throw new ForbiddenException(
        `Real-money gaming is not available in your state (${incomingState}) due to local regulations. You can still enjoy free-play games.`,
      );
    }

    if (!userId) {
      return true; // Let auth guards handle unauthenticated
    }

    // Check user's registered state
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { state: true },
    });

    if (!user?.state) {
      return true;
    }

    if (isStateBanned(user.state)) {
      throw new ForbiddenException(
        `Real-money gaming is not available in your state (${user.state}) due to local regulations. You can still enjoy free-play games.`,
      );
    }

    return true;
  }
}

/**
 * Utility: Validate state at registration, profile update, or geo-location check.
 * Handles both 2-letter codes (e.g. 'AS', 'OD', 'TS') and full names (e.g. 'Assam', 'Odisha').
 */
export function isStateBanned(stateInput: string): boolean {
  if (!stateInput || typeof stateInput !== 'string') return false;
  const normalized = stateInput.trim().toUpperCase();
  return BANNED_STATE_CODES.has(normalized) || BANNED_STATE_NAMES.has(normalized);
}

export { BANNED_STATES, BANNED_STATE_CODES, BANNED_STATE_NAMES };

