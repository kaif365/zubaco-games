import { Global, Module } from '@nestjs/common';
import { AntiCheatController } from './anti-cheat.controller';
import { AntiCheatService } from './anti-cheat.service';
import { ServiceIdentityGuard } from '../auth/service-identity/service-identity.guard';
import { EnforcementService } from './enforcement/enforcement.service';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { CryptographicSessionService } from './crypto/cryptographic-session.service';
import { CadenceAnalyzerService } from './heuristics/cadence-analyzer.service';

@Global()
@Module({
  imports: [LeaderboardModule],
  controllers: [AntiCheatController],
  providers: [
    AntiCheatService,
    ServiceIdentityGuard,
    EnforcementService,
    CryptographicSessionService,
    CadenceAnalyzerService,
  ],
  exports: [AntiCheatService, EnforcementService, CryptographicSessionService, CadenceAnalyzerService],
})
export class AntiCheatModule {}

