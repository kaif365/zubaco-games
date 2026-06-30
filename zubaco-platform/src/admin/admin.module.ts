import { Global, Module } from '@nestjs/common';
import { TournamentModule } from '../tournament/tournament.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminControlPlaneService } from './control-plane/admin-control-plane.service';

/**
 * Authoritative admin control plane. Provides one RBAC-gated, audited service
 * the admin console invokes instead of writing platform tables directly.
 * Anti-cheat enforcement + event bus are @Global. Global so legacy admin
 * callers can adapt onto it.
 */
@Global()
@Module({
  imports: [TournamentModule, WalletModule],
  providers: [AdminControlPlaneService],
  exports: [AdminControlPlaneService],
})
export class AdminModule {}
