@echo off
setlocal
set "WORKSPACE=%~dp0.."
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'scripts/duduq-autopilot.mjs','start' -WorkingDirectory '%WORKSPACE%' -WindowStyle Hidden"
endlocal
