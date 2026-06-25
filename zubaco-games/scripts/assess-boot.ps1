$root = 'C:\zubaco-games\zubaco-games'
$backends = Get-ChildItem $root -Recurse -Filter 'package.json' -Depth 2 -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -like '*-backend' } |
    Select-Object -ExpandProperty DirectoryName -Unique
Write-Output "COUNT=$($backends.Count)"
foreach ($b in $backends) {
    $name = Split-Path $b -Leaf
    $pkg = Get-Content "$b\package.json" -Raw
    $cv = if ($pkg -match '"class-validator"') { 'cv' } else { 'NOcv' }
    $ct = if ($pkg -match '"class-transformer"') { 'ct' } else { 'NOct' }
    $hm = "$b\src\health\health.module.ts"
    if (Test-Path $hm) {
        $hmRaw = Get-Content $hm -Raw
        $hasQHI = $hmRaw -match 'QueueHealthIndicator'
        $hasQM = $hmRaw -match 'QueueModule'
        $qm = if (-not $hasQHI) { 'noQHI' } elseif ($hasQM) { 'QM' } else { 'MISSING-QM' }
    } else { $qm = 'noHM' }
    $sch = "$b\prisma\schema.prisma"
    $out = if (Test-Path $sch) { (Select-String -Path $sch -Pattern 'output\s*=' | Select-Object -First 1).Line.Trim() } else { 'no-schema' }
    Write-Output ("{0,-34} {1,-5} {2,-5} {3,-12} {4}" -f $name, $cv, $ct, $qm, $out)
}
