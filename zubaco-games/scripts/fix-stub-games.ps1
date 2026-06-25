# Fix STUB game backends: install pg driver adapter, rewrite PrismaService + seed to use it.
# Prisma 7 engine-less client REQUIRES a driver adapter; bare new PrismaClient() throws.
$ErrorActionPreference = 'Continue'
$root = 'C:\zubaco-games\zubaco-games'
$env:NODE_EXTRA_CA_CERTS = 'C:\TEMP\cisco-umbrella-ca.crt'
$log = "$root\scripts\fix-stub-games.log"
"=== fix-stub-games run $(Get-Date -Format o) ===" | Out-File $log

# backend folder name -> database name (the 14 seed-broken games)
$map = [ordered]@{
  'flash-spot-backend'              = 'flash_spot'
  'live-route-backend'              = 'live_route'
  'memory-card-matching-backend'    = 'memory_card_matching'
  'memory-groups-backend'           = 'memory_groups'
  'number-grid-backend'             = 'number_grid'
  'object-placement-memory-backend' = 'object_placement'
  'pattern-survival-backend'        = 'pattern_survival'
  'rapid-sort-backend'              = 'rapid_sort'
  'reflex-endurance-backend'        = 'reflex_endurance'
  'sequence-recall-backend'         = 'sequence_recall'
  'sliding-puzzle-backend'          = 'sliding_puzzle'
  'speed-type-backend'              = 'speed_type'
  'true-false-blitz-backend'        = 'true_false_blitz'
  'word-unscramble-backend'         = 'word_unscramble'
}

# Adapter-based PrismaService template (stub import path is uniform).
$serviceTemplate = @'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error('DATABASE_URL is not set');
    }
    const url = new URL(raw);
    const pool = new Pool({
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: decodeURIComponent(url.pathname.slice(1)),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: url.searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false },
    });
    super({ adapter: new PrismaPg(pool) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
'@

# Pure-expression adapter for seed.ts (replaces bare `new PrismaClient()`).
$seedAdapter = "new PrismaClient({ adapter: new (require('@prisma/adapter-pg').PrismaPg)(new (require('pg').Pool)({ host: new URL(process.env.DATABASE_URL).hostname, port: Number(new URL(process.env.DATABASE_URL).port) || 5432, database: decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)), user: decodeURIComponent(new URL(process.env.DATABASE_URL).username), password: decodeURIComponent(new URL(process.env.DATABASE_URL).password), ssl: new URL(process.env.DATABASE_URL).searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false } })) })"

foreach ($name in $map.Keys) {
  $db = $map[$name]
  $bd = Get-ChildItem -Path $root -Directory -Recurse -Depth 1 -Filter $name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $bd) { ("{0,-32} NOT-FOUND" -f $name) | Tee-Object -FilePath $log -Append; continue }
  $dir = $bd.FullName
  Set-Location $dir
  $url = "postgresql://zubaco:zubaco_dev_2024@localhost:5432/$db" + "?sslmode=disable"
  $env:DATABASE_URL = $url

  $deps = 'have'; $svc = 'skip'; $seedp = 'skip'; $gen = 'skip'; $push = 'skip'; $seed = 'skip'

  # 1) ensure adapter-pg + pg
  if (-not (Test-Path "$dir\node_modules\@prisma\adapter-pg")) {
    cmd /c "npm install @prisma/adapter-pg@7.8.0 pg@8.21.0 --legacy-peer-deps --no-audit --no-fund > nul 2>&1"
    $deps = if ($LASTEXITCODE -eq 0) { 'installed' } else { "FAIL($LASTEXITCODE)" }
  }

  # 2) patch PrismaService if it lacks the adapter
  $svcFile = "$dir\src\common\prisma\prisma.service.ts"
  if (Test-Path $svcFile) {
    if (-not (Select-String -Path $svcFile -Pattern 'PrismaPg' -Quiet)) {
      Set-Content -Path $svcFile -Value $serviceTemplate -Encoding UTF8
      $svc = 'patched'
    } else { $svc = 'already' }
  } else { $svc = 'NO-FILE' }

  # 3) patch seed.ts bare new PrismaClient() via literal string replace (no regex)
  $seedFile = "$dir\prisma\seed.ts"
  if (Test-Path $seedFile) {
    $content = Get-Content $seedFile -Raw
    if ($content.Contains('new PrismaClient()')) {
      $content = $content.Replace('new PrismaClient()', $seedAdapter)
      Set-Content -Path $seedFile -Value $content -Encoding UTF8 -NoNewline
      $seedp = 'patched'
    } else { $seedp = 'already' }
  } else { $seedp = 'NO-SEED' }

  # 4) regenerate client, push, seed
  cmd /c "npx prisma generate > nul 2>&1"; $gen = if ($LASTEXITCODE -eq 0) { 'OK' } else { "FAIL($LASTEXITCODE)" }
  cmd /c "npx prisma db push --accept-data-loss > nul 2>&1"; $push = if ($LASTEXITCODE -eq 0) { 'OK' } else { "FAIL($LASTEXITCODE)" }
  if (Test-Path $seedFile) { cmd /c "npx ts-node --transpile-only prisma/seed.ts > nul 2>&1"; $seed = if ($LASTEXITCODE -eq 0) { 'OK' } else { "FAIL($LASTEXITCODE)" } }

  ("{0,-32} deps={1,-12} svc={2,-9} seedpatch={3,-9} gen={4,-9} push={5,-9} seed={6}" -f $name, $deps, $svc, $seedp, $gen, $push, $seed) | Tee-Object -FilePath $log -Append
}
"=== DONE $(Get-Date -Format o) ===" | Tee-Object -FilePath $log -Append
