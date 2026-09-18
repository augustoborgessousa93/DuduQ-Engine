@echo off
setlocal
cd /d "%~dp0"
if not defined PORT set "PORT=4173"
echo Starting DUDUQ Matching preview from:
echo %CD%
node "%~dp0preview-server.mjs"
