# Fix DATABASE_URL in each game .env (examples ship placeholder creds), then push+seed.
$ErrorActionPreference = 'Continue'
$root = 'C:\zubaco-games\zubaco-games'
$env:NODE_EXTRA_CA_CERTS = 'C:\TEMP\cisco-umbrella-ca.crt'
$logFile = "$root\scripts\fix-pushseed.log"
"=== fix-pushseed run $(Get-Date -Format o) ===" | Out-File $logFile

# backend folder name -> database name
$map = @{
  'arrows-backend'                  = 'arrows'
  'block-fill-backend'              = 'block_fill'
  'colour-sorting-backend'          = 'colour_sorting'
  'flash-spot-backend'              = 'flash_spot'
  'Infinity-Loop-backend'           = 'infinity_loop'
  'live-route-backend'              = 'live_route'
  'logic-reflector-backend'         = 'logic_reflector'
  'maze-navigation-backend'         = 'maze_navigation'
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

function Step($block) {
  $global:LASTEXITCODE = 0
  try { & $block } catch { }
  if ($LASTEXITCODE -ne 0) { return "FAIL($LASTEXITCODE)" }
  return 'OK'
}

foreach ($name in ($map.Keys | Sort-Object)) {
  $db = $map[$name]
  # find the backend dir
  $bd = Get-ChildItem -Path $root -Directory -Recurse -Depth 1 -Filter $name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $bd) { ("{0,-32} NOT-FOUND" -f $name) | Tee-Object -FilePath $logFile -Append; continue }
  $dir = $bd.FullName
  $envFile = "$dir\.env"
  if (-not (Test-Path $envFile)) { ("{0,-32} NO-ENV" -f $name) | Tee-Object -FilePath $logFile -Append; continue }

  $url = "postgresql://zubaco:zubaco_dev_2024@localhost:5432/$db" + "?sslmode=disable"
  # Remove any existing DATABASE_URL lines, then append the correct one.
  # Avoid -replace (the URL contains $ / ? which break regex replacement strings).
  $lines = @(Get-Content $envFile | Where-Object { $_ -notmatch '^\s*DATABASE_URL\s*=' })
  $lines += ('DATABASE_URL="' + $url + '"')
  Set-Content -Path $envFile -Value $lines -Encoding UTF8

  Set-Location $dir
  $env:DATABASE_URL = $url
  $push = 'skip'; $seed = 'skip'
  if (Test-Path "$dir\prisma\schema.prisma") { cmd /c "npx prisma db push --accept-data-loss > nul 2>&1"; $push = if ($LASTEXITCODE -eq 0) { 'OK' } else { "FAIL($LASTEXITCODE)" } }
  if (Test-Path "$dir\prisma\seed.ts")        { cmd /c "npx ts-node --transpile-only prisma/seed.ts > nul 2>&1"; $seed = if ($LASTEXITCODE -eq 0) { 'OK' } else { "FAIL($LASTEXITCODE)" } }
  ("{0,-32} db={1,-22} push={2,-10} seed={3}" -f $name, $db, $push, $seed) | Tee-Object -FilePath $logFile -Append
}
"=== DONE $(Get-Date -Format o) ===" | Tee-Object -FilePath $logFile -Append
