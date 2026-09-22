@echo off
setlocal
cd /d "%~dp0"
echo DUDUQ Penpot MCP bootstrap
node scripts\duduq-penpot-bootstrap.mjs --start-only
if errorlevel 1 (
  echo.
  echo Bootstrap failed. Check the message above.
  exit /b 1
)
echo.
echo Services ready. Update Core was not run.
endlocal
