param([string]$Workspace = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$taskName = 'DuduQ Autopilot'
$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $Workspace 'scripts/duduq-autopilot.mjs'
$launcher = Join-Path $Workspace 'scripts/duduq-autopilot-start.cmd'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName = 'DuduQ Autopilot'
$startup = [Environment]::GetFolderPath('Startup')
$startupLauncher = Join-Path $startup 'DuduQ Autopilot.cmd'
if (-not (Test-Path $launcher)) { throw "Missing launcher: $launcher" }
$scheduled = $false
try {
  $action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`" start" -WorkingDirectory $Workspace
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description 'DUDUQ workspace continuity watcher' -Force | Out-Null
  $scheduled = $true
} catch {
  Write-Warning "Scheduled Task unavailable without elevation; installing user-level fallback. $($_.Exception.Message)"
}
try {
  New-Item -Path $runKey -Force | Out-Null
  Set-ItemProperty -Path $runKey -Name $runName -Value "`"$launcher`""
  Write-Host "HKCU Run autostart installed: $launcher"
} catch {
  Write-Warning "HKCU Run unavailable in this session; using Startup folder fallback. $($_.Exception.Message)"
}
Copy-Item -LiteralPath $launcher -Destination $startupLauncher -Force
Write-Host "User-level Startup autostart installed: $startupLauncher"
Write-Host "Startup entry: $startupLauncher"
if ($scheduled) { Write-Host "Scheduled Task also installed: $taskName" }
