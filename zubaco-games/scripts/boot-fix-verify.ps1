# Boot-verify every game backend; auto-fix the common runtime blockers found:
#  1. missing class-validator / class-transformer (ValidationPipe crashes at bootstrap)
#  2. engine-less prisma client in generated/ not copied to dist (relative import breaks)
#  3. HealthModule's QueueHealthIndicator DI when QueueModule isn't imported
$ErrorActionPreference = 'Continue'
$root = 'C:\zubaco-games\zubaco-games'
$env:NODE_EXTRA_CA_CERTS = 'C:\TEMP\cisco-umbrella-ca.crt'
$log = "$root\scripts\boot-fix-verify.log"
"=== boot-fix-verify $(Get-Date -Format o) ===" | Out-File $log

$map = @{
    'arrows-backend' = 'arrows'; 'block-fill-backend' = 'block_fill'; 'colour-sorting-backend' = 'colour_sorting'
    'flash-spot-backend' = 'flash_spot'; 'Infinity-Loop-backend' = 'infinity_loop'; 'live-route-backend' = 'live_route'
    'logic-reflector-backend' = 'logic_reflector'; 'maze-navigation-backend' = 'maze_navigation'
    'memory-card-matching-backend' = 'memory_card_matching'; 'memory-groups-backend' = 'memory_groups'
    'number-grid-backend' = 'number_grid'; 'object-placement-memory-backend' = 'object_placement'
    'pattern-survival-backend' = 'pattern_survival'; 'rapid-sort-backend' = 'rapid_sort'
    'reflex-endurance-backend' = 'reflex_endurance'; 'sequence-recall-backend' = 'sequence_recall'
    'sliding-puzzle-backend' = 'sliding_puzzle'; 'speed-type-backend' = 'speed_type'
    'true-false-blitz-backend' = 'true_false_blitz'; 'word-unscramble-backend' = 'word_unscramble'
}

function Get-EnvVal($file, $key) {
    if (-not (Test-Path $file)) { return $null }
    $m = Select-String -Path $file -Pattern ("^\s*{0}\s*=\s*(.+)$" -f $key) | Select-Object -First 1
    if ($m) { return ($m.Matches[0].Groups[1].Value.Trim().Trim('"')) }
    return $null
}

function Patch-HealthQueue($dir) {
    $hm = "$dir\src\health\health.module.ts"
    if (-not (Test-Path $hm)) { return $false }
    if (-not (Test-Path "$dir\src\queue\queue.module.ts")) { return $false }
    $raw = Get-Content $hm -Raw
    if ($raw -notmatch 'QueueHealthIndicator') { return $false }
    if ($raw -match 'QueueModule') { return $false }
    $raw = $raw -replace "(import\s*\{\s*QueueHealthIndicator\s*\}\s*from\s*'\./queue\.health';)", "`$1`r`nimport { QueueModule } from '../queue/queue.module';"
    $raw = $raw -replace "imports:\s*\[", "imports: [QueueModule, "
    Set-Content -Path $hm -Value $raw -Encoding UTF8
    return $true
}

function Ensure-PostbuildCopy($dir) {
    return  # handled separately by add-postbuild.ps1
}

function Build-And-Copy($dir) {
    Push-Location $dir
    cmd /c "npx prisma generate > nul 2>&1" | Out-Null
    cmd /c "npm run build > nul 2>&1"; $code = $LASTEXITCODE
    # safety: copy generated -> dist/generated even if postbuild missed it
    if ((Test-Path "$dir\generated") -and -not (Test-Path "$dir\dist\generated")) {
        Copy-Item "$dir\generated" "$dir\dist\generated" -Recurse -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
    return $code
}

function Boot-Test($dir, $db, $port) {
    Get-Job -Name boot -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue
    Get-Job -Name boot -ErrorAction SilentlyContinue | Remove-Job -Force -ErrorAction SilentlyContinue
    $url = "postgresql://zubaco:zubaco_dev_2024@localhost:5432/$db" + "?sslmode=disable"
    Start-Job -Name boot -ScriptBlock {
        param($d, $u, $p)
        $env:NODE_EXTRA_CA_CERTS = 'C:\TEMP\cisco-umbrella-ca.crt'
        Set-Location $d
        $env:DATABASE_URL = $u; $env:PORT = "$p"
        $env:JWT_SECRET = 'dev-jwt-secret'; $env:HMAC_SECRET = 'dev-hmac-secret'; $env:ADMIN_API_KEYS = 'dev-admin-key'
        $env:REDIS_HOST = 'localhost'; $env:REDIS_PORT = '6379'
        node dist/src/main.js *>&1
    } -ArgumentList $dir, $url, $port | Out-Null
    Start-Sleep -Seconds 13
    $out = Receive-Job -Name boot
    $health = $null
    foreach ($path in @("http://localhost:$port/api/v1/health", "http://localhost:$port/health", "http://localhost:$port/api/health")) {
        try { $health = (Invoke-WebRequest -Uri $path -UseBasicParsing -TimeoutSec 6).StatusCode; break } catch { }
    }
    Stop-Job -Name boot -ErrorAction SilentlyContinue
    Remove-Job -Name boot -Force -ErrorAction SilentlyContinue
    return [pscustomobject]@{ Health = $health; Out = ($out -join "`n") }
}

foreach ($name in ($map.Keys | Sort-Object)) {
    $db = $map[$name]
    $bd = Get-ChildItem -Path $root -Directory -Recurse -Depth 1 -Filter $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $bd) { ("{0,-32} NOT-FOUND" -f $name) | Tee-Object -FilePath $log -Append; continue }
    $dir = $bd.FullName
    $port = Get-EnvVal "$dir\.env" 'PORT'
    if (-not $port) { $port = '3100' }

    # 1. deps
    $deps = 'have'
    if (-not (Test-Path "$dir\node_modules\class-validator") -or -not (Test-Path "$dir\node_modules\class-transformer")) {
        Push-Location $dir
        cmd /c "npm install class-validator class-transformer --legacy-peer-deps > nul 2>&1" | Out-Null
        Pop-Location
        $deps = 'installed'
    }
    # 3. build
    $bcode = Build-And-Copy $dir
    # 4. boot
    $r = Boot-Test $dir $db $port
    $fix = ''
    if (-not $r.Health -and $r.Out -match 'QueueHealthIndicator') {
        if (Patch-HealthQueue $dir) {
            $fix = '+QM'
            Build-And-Copy $dir | Out-Null
            $r = Boot-Test $dir $db $port
        }
    }
    $status = if ($r.Health -eq 200) { 'UP-200' } elseif ($r.Health) { "HTTP-$($r.Health)" } else { 'DOWN' }
    if ($status -eq 'DOWN') {
        $tail = ($r.Out -split "`n" | Select-Object -Last 4) -join ' | '
        ("{0,-32} port={1,-5} deps={2,-9} build={3,-4} {4,-6} {5}  ERR:{6}" -f $name, $port, $deps, $bcode, $status, $fix, $tail) | Tee-Object -FilePath $log -Append
    } else {
        ("{0,-32} port={1,-5} deps={2,-9} build={3,-4} {4,-6} {5}" -f $name, $port, $deps, $bcode, $status, $fix) | Tee-Object -FilePath $log -Append
    }
}
"=== DONE $(Get-Date -Format o) ===" | Tee-Object -FilePath $log -Append
