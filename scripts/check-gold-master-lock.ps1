$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$state = Get-Content -LiteralPath (Join-Path $root 'DUDUQ_PROJECT_STATE.json') -Raw | ConvertFrom-Json
$results = @()

foreach ($property in $state.goldMasters.PSObject.Properties) {
  $mechanic = $property.Name
  $record = $property.Value
  $commit = [string]$record.commit
  $relativePath = [string]$record.path
  if (-not $commit -or -not $relativePath -or [IO.Path]::IsPathRooted($relativePath) -or $relativePath -match '(^|[\\/])\.\.([\\/]|$)') {
    throw "GOLD_MASTER_LOCK_INVALID_PROJECT_STATE:$mechanic"
  }
  $fullPath = [IO.Path]::GetFullPath((Join-Path $root $relativePath))
  if (-not $fullPath.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "GOLD_MASTER_LOCK_PATH_OUTSIDE_WORKSPACE:$mechanic"
  }
  $commitType = & git cat-file -t $commit 2>$null
  if ($LASTEXITCODE -ne 0 -or $commitType -ne 'commit') {
    throw "GOLD_MASTER_LOCK_BASELINE_COMMIT_MISSING:${mechanic}:$commit"
  }
  $head = & git rev-parse HEAD
  if ($LASTEXITCODE -ne 0) { throw "GOLD_MASTER_LOCK_HEAD_UNAVAILABLE:$mechanic" }

  $trackedLines = @(& git diff --name-status --no-renames $head -- $relativePath)
  if ($LASTEXITCODE -ne 0) { throw "GOLD_MASTER_LOCK_DIFF_FAILED:$mechanic" }
  $untrackedLines = @(& git ls-files --others --exclude-standard -- $relativePath)
  if ($LASTEXITCODE -ne 0) { throw "GOLD_MASTER_LOCK_UNTRACKED_SCAN_FAILED:$mechanic" }
  $committedEvolution = @(& git diff --name-status --no-renames "$commit..$head" -- $relativePath)
  if ($LASTEXITCODE -ne 0) { throw "GOLD_MASTER_LOCK_HISTORY_DIFF_FAILED:$mechanic" }
  $changed = @()
  foreach ($line in $trackedLines) {
    if (-not $line) { continue }
    $parts = $line -split "`t", 2
    $file = if ($parts.Count -gt 1) { $parts[1] } else { $parts[0] }
    $absolute = Join-Path $root $file
    $currentHash = if (Test-Path -LiteralPath $absolute -PathType Leaf) { (Get-FileHash -Algorithm SHA256 -LiteralPath $absolute).Hash.ToLowerInvariant() } else { $null }
    $blob = & git rev-parse "$head`:$file" 2>$null
    if ($LASTEXITCODE -ne 0) { $blob = $null }
    $changed += [PSCustomObject]@{ status = $parts[0]; path = $file; baselineGitBlob = $blob; currentSha256 = $currentHash }
  }
  foreach ($file in $untrackedLines) {
    if (-not $file) { continue }
    $absolute = Join-Path $root $file
    $currentHash = if (Test-Path -LiteralPath $absolute -PathType Leaf) { (Get-FileHash -Algorithm SHA256 -LiteralPath $absolute).Hash.ToLowerInvariant() } else { $null }
    $changed += [PSCustomObject]@{ status = '??'; path = $file; baselineGitBlob = $null; currentSha256 = $currentHash }
  }
  $baselineFiles = @(& git ls-tree -r --name-only $commit -- $relativePath)
  if ($LASTEXITCODE -ne 0) { throw "GOLD_MASTER_LOCK_BASELINE_TREE_FAILED:$mechanic" }
  $currentFiles = if (Test-Path -LiteralPath $fullPath) { @(Get-ChildItem -LiteralPath $fullPath -File -Recurse -Force | ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\','/') }) } else { @() }
  $results += [PSCustomObject]@{
    mechanic = $mechanic
    version = $record.version
    baselineCommit = $commit
    currentHead = $head
    protectedPath = $relativePath
    baselineFileCount = $baselineFiles.Count
    currentFileCount = $currentFiles.Count
    status = if ($changed.Count) { 'WORKTREE_DRIFT_DETECTED' } elseif ($committedEvolution.Count) { 'BASELINE_REFERENCE_STALE' } else { 'LOCK_INTACT' }
    committedEvolutionFromDeclaredBaseline = @($committedEvolution)
    changedFiles = @($changed)
  }
}

$overall = if (@($results | Where-Object status -ne 'LOCK_INTACT').Count) { 'ISSUE' } else { 'PASS' }
[PSCustomObject]@{
  status = $overall
  authority = 'DUDUQ_PROJECT_STATE.json goldMasters entries; read-only checker, no repairs or writes'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  goldMasters = @($results)
} | ConvertTo-Json -Depth 8
if ($overall -ne 'PASS') { exit 1 }
