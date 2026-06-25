# Setup pipeline for all per-game backends.
# Idempotent-ish: ensures .env, installs deps, prisma generate + db push, build.
# Writes a status log to scripts\setup-all-games.log

$ErrorActionPreference = 'Continue'
$root = 'C:\zubaco-games\zubaco-games'
$env:NODE_EXTRA_CA_CERTS = 'C:\TEMP\cisco-umbrella-ca.crt'
$logFile = "$root\scripts\setup-all-games.log"
"=== setup-all-games run $(Get-Date -Format o) ===" | Out-File $logFile

function Step($name, $block) {
  try { & $block; if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { return "FAIL($LASTEXITCODE)" }; return 'OK' }
  catch { return "ERR:$($_.Exception.Message.Split([Environment]::NewLine)[0])" }
}

$backends = Get-ChildItem -Path $root -Directory | ForEach-Object {
  Get-ChildItem -Path $_.FullName -Directory -Filter '*-backend' -ErrorAction SilentlyContinue
} | Where-Object { Test-Path "$($_.FullName)\package.json" }

$results = @()
foreach ($bd in $backends) {
  $dir = $bd.FullName
  $name = $bd.Name
  Set-Location $dir
  $row = [ordered]@{ game = $name; env=''; install=''; gen=''; push=''; build='' }

  # 1. ensure .env
  if (-not (Test-Path "$dir\.env")) {
    if (Test-Path "$dir\.env.example") { Copy-Item "$dir\.env.example" "$dir\.env"; $row.env='copied' }
    else { $row.env='MISSING' }
  } else { $row.env='exists' }

  # parse DATABASE_URL
  $dbline = (Get-Content "$dir\.env" -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1)
  if ($dbline) {
    $val = ($dbline -replace '^\s*DATABASE_URL\s*=', '').Trim().Trim('"').Trim("'")
    $env:DATABASE_URL = $val
  }

  # auto-fix redis retryStrategy untyped param (TS7006)
  $redisFile = "$dir\src\redis\redis.service.ts"
  if (Test-Path $redisFile) {
    $c = Get-Content $redisFile -Raw
    if ($c -match 'retryStrategy\(\s*times\s*\)') {
      $c = $c -replace 'retryStrategy\(\s*times\s*\)', 'retryStrategy(times: number)'
      Set-Content $redisFile $c -NoNewline
    }
  }

  # 2. install
  if (-not (Test-Path "$dir\node_modules")) {
    $row.install = Step 'install' { npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | Out-Null }
  } else { $row.install = 'present' }

  # 3. prisma generate
  if (Test-Path "$dir\prisma\schema.prisma") {
    $row.gen = Step 'gen' { npx prisma generate 2>&1 | Out-Null }
    # 4. db push
    $row.push = Step 'push' { npx prisma db push --accept-data-loss 2>&1 | Out-Null }
  } else { $row.gen='no-schema'; $row.push='no-schema' }

  # 5. build
  $row.build = Step 'build' { npm run build 2>&1 | Out-Null }

  $line = ("{0,-30} env={1,-8} install={2,-10} gen={3,-10} push={4,-10} build={5}" -f $row.game,$row.env,$row.install,$row.gen,$row.push,$row.build)
  $line | Tee-Object -FilePath $logFile -Append
  $results += [pscustomobject]$row
}

"=== DONE $(Get-Date -Format o) ===" | Tee-Object -FilePath $logFile -Append
$results | Format-Table -AutoSize
