# Push schema + seed for all game backends (run AFTER setup-all-games.ps1).
$ErrorActionPreference = 'Continue'
$root = 'C:\zubaco-games\zubaco-games'
$env:NODE_EXTRA_CA_CERTS = 'C:\TEMP\cisco-umbrella-ca.crt'
$logFile = "$root\scripts\push-seed-all-games.log"
"=== push-seed run $(Get-Date -Format o) ===" | Out-File $logFile

function Step($block) {
  try { & $block; if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { return "FAIL($LASTEXITCODE)" }; return 'OK' }
  catch { return "ERR:$($_.Exception.Message.Split([Environment]::NewLine)[0])" }
}

$backends = Get-ChildItem -Path $root -Directory | ForEach-Object {
  Get-ChildItem -Path $_.FullName -Directory -Filter '*-backend' -ErrorAction SilentlyContinue
} | Where-Object { Test-Path "$($_.FullName)\package.json" }

foreach ($bd in $backends) {
  $dir = $bd.FullName
  Set-Location $dir
  $dbline = (Get-Content "$dir\.env" -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1)
  if ($dbline) {
    $val = ($dbline -replace '^\s*DATABASE_URL\s*=', '').Trim().Trim('"').Trim("'")
    $env:DATABASE_URL = $val
  } else { ("{0,-30} NO-DATABASE_URL" -f $bd.Name) | Tee-Object -FilePath $logFile -Append; continue }

  $push = 'skip'; $seed = 'skip'
  if (Test-Path "$dir\prisma\schema.prisma") {
    $push = Step { npx prisma db push --accept-data-loss 2>&1 | Out-Null }
  }
  if (Test-Path "$dir\prisma\seed.ts") {
    $seed = Step { npx ts-node --transpile-only prisma/seed.ts 2>&1 | Out-Null }
  }
  ("{0,-30} dburl={1,-32} push={2,-10} seed={3}" -f $bd.Name, $val, $push, $seed) | Tee-Object -FilePath $logFile -Append
}
"=== DONE $(Get-Date -Format o) ===" | Tee-Object -FilePath $logFile -Append
