const fs = require('fs');
const path = require('path');

const all = [
  'flash-spot/flash-spot-backend','colour-sorting/colour-sorting-backend','object-placement-memory/object-placement-memory-backend',
  'rapid-category-sort/rapid-sort-backend','true-false-blitz/true-false-blitz-backend','word-unscramble/word-unscramble-backend',
  'number-grid-sprint/number-grid-backend','live-route-builder/live-route-backend','memory-groups/memory-groups-backend',
  'reflex-endurance/reflex-endurance-backend','pattern-survival/pattern-survival-backend','speed-type-answer/speed-type-backend',
  'sequence-recall/sequence-recall-backend','memory-card-matching/memory-card-matching-backend','sliding-puzzle/sliding-puzzle-backend',
  'block-fill/block-fill-backend','maze-navigation/maze-navigation-backend','Infinity-loop/Infinity-Loop-backend',
  'arrows/arrows-backend','logic-reflector/logic-reflector-backend',
];

const secretsService = `import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface SecretConfig {
  key: string;
  source: 'env' | 'vault' | 'aws-sm';
  vaultPath?: string;
  awsSecretName?: string;
  rotationInterval?: number; // seconds
}

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private readonly secretCache = new Map<string, { value: string; expiresAt: number }>();
  private readonly rotationIntervals = new Map<string, NodeJS.Timeout>();

  async onModuleInit(): Promise<void> {
    this.logger.log('Secrets service initialized');
  }

  /**
   * Get a secret value. Checks cache, then env, then external provider.
   */
  async getSecret(key: string): Promise<string | undefined> {
    // Check cache
    const cached = this.secretCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Fallback to environment variable
    const envValue = process.env[key];
    if (envValue) {
      this.secretCache.set(key, { value: envValue, expiresAt: Date.now() + 3600_000 });
      return envValue;
    }

    // In production, could call Vault/AWS Secrets Manager here
    const provider = process.env.SECRETS_PROVIDER;
    if (provider === 'vault') {
      return this.getFromVault(key);
    }
    if (provider === 'aws-sm') {
      return this.getFromAwsSecretsManager(key);
    }

    return undefined;
  }

  /**
   * Get required secret - throws if not found
   */
  async getRequiredSecret(key: string): Promise<string> {
    const value = await this.getSecret(key);
    if (!value) {
      throw new Error(\`Required secret "\${key}" not found in any provider\`);
    }
    return value;
  }

  /**
   * Register a secret for automatic rotation
   */
  registerRotation(key: string, intervalSeconds: number): void {
    if (this.rotationIntervals.has(key)) return;

    const interval = setInterval(async () => {
      try {
        this.secretCache.delete(key);
        await this.getSecret(key); // Refresh
        this.logger.log(\`Secret "\${key}" rotated successfully\`);
      } catch (err) {
        this.logger.error(\`Failed to rotate secret "\${key}": \${(err as Error).message}\`);
      }
    }, intervalSeconds * 1000);

    this.rotationIntervals.set(key, interval);
    this.logger.log(\`Registered rotation for "\${key}" every \${intervalSeconds}s\`);
  }

  onModuleDestroy(): void {
    this.rotationIntervals.forEach((interval) => clearInterval(interval));
    this.rotationIntervals.clear();
  }

  private async getFromVault(key: string): Promise<string | undefined> {
    // HashiCorp Vault integration placeholder
    // In production: call Vault HTTP API with token auth
    const vaultAddr = process.env.VAULT_ADDR;
    const vaultToken = process.env.VAULT_TOKEN;
    if (!vaultAddr || !vaultToken) return undefined;

    try {
      const vaultPath = \`secret/data/zubaco/\${key.toLowerCase()}\`;
      this.logger.debug(\`Fetching from Vault: \${vaultPath}\`);
      // const response = await fetch(\`\${vaultAddr}/v1/\${vaultPath}\`, {
      //   headers: { 'X-Vault-Token': vaultToken },
      // });
      // const data = await response.json();
      // return data.data?.data?.value;
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async getFromAwsSecretsManager(key: string): Promise<string | undefined> {
    // AWS Secrets Manager integration placeholder
    this.logger.debug(\`Would fetch from AWS SM: \${key}\`);
    return undefined;
  }
}
`;

const secretsModule = `import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';

@Global()
@Module({
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
`;

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function writeIfMissing(fp, c) { if (!fs.existsSync(fp)) { fs.writeFileSync(fp, c); return true; } return false; }

all.forEach((dir) => {
  const sDir = path.join(dir, 'src/secrets');
  ensureDir(sDir);
  writeIfMissing(path.join(sDir, 'secrets.service.ts'), secretsService);
  writeIfMissing(path.join(sDir, 'secrets.module.ts'), secretsModule);

  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');
  if (!appModule.includes('SecretsModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].match(/^import /)) { insertIdx = i + 1; break; } }
    lines.splice(insertIdx, 0, "import { SecretsModule } from './secrets/secrets.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        SecretsModule,');
    fs.writeFileSync(appModulePath, appModule);
  }
  console.log(`OK ${dir}`);
});
console.log('\\nP43 Done!');
