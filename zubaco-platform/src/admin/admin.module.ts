import { Global, Module } from '@nestjs/common';
import { TournamentModule } from '../tournament/tournament.module';
import { WalletModule } from '../wallet/wallet.module';
import { ServiceIdentityGuard } from '../auth/service-identity/service-identity.guard';
import { AdminControlPlaneController } from './control-plane/admin-control-plane.controller';
import { AdminControlPlaneService } from './control-plane/admin-control-plane.service';

/**
 * Authoritative admin control plane. Exposes one RBAC-gated, audited HTTP entry
 * point (AdminControlPlaneController) the admin console invokes instead of
 * writing platform tables directly (ROLLOUT-001). Anti-cheat enforcement +
 * event bus are @Global. Global so legacy admin callers can adapt onto it.
 */
@Global()
@Module({
  imports: [TournamentModule, WalletModule],
  controllers: [AdminControlPlaneController],
  providers: [AdminControlPlaneService, ServiceIdentityGuard],
  exports: [AdminControlPlaneService],
})
export class AdminModule {}
