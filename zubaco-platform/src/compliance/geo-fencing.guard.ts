import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * States where real-money gaming is PROHIBITED in India.
 * As per various High Court rulings and state gambling laws.
 */
const BANNED_STATES = [
  'AP', // Andhra Pradesh
  'AS', // Assam
  'TG', // Telangana (Telangana Gaming Act 2017)
  'OR', // Odisha
  'SK', // Sikkim (requires specific license)
  'NL', // Nagaland (requires specific license)
  'AR', // Arunachal Pradesh
  'MG', // Meghalaya
];

@Injectable()
export class GeoFencingGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.user?.sub;

    if (!userId) {
      return true; // Let auth guards handle unauthenticated
    }

    // Check user's registered state
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { state: true },
    });

    if (!user?.state) {
      // If state not set, allow access but the user should set it
      return true;
    }

    if (BANNED_STATES.includes(user.state.toUpperCase())) {
      throw new ForbiddenException(
        `Real-money gaming is not available in your state (${user.state}) due to local regulations. You can still enjoy free-play games.`,
      );
    }

    return true;
  }
}

/**
 * Utility: Validate state at registration/update time
 */
export function isStateBanned(stateCode: string): boolean {
  return BANNED_STATES.includes(stateCode.toUpperCase());
}

export { BANNED_STATES };
