@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

set "ROOT=%CD%"
set "HOME_URL=http://127.0.0.1:4173/content/english/year-3/index.html"

echo ========================================
echo DuduQ - Year 3 - Teste local
echo ========================================
echo.

call :probe_duduq
if not errorlevel 1 goto OPEN_EXISTING

call :port_in_use
if not errorlevel 1 goto PORT_OCCUPIED

call :find_python
if errorlevel 1 goto NO_PYTHON

echo Iniciando servidor DuduQ em 127.0.0.1:4173...
start "DuduQ Year 3 - Servidor" /D "%ROOT%" cmd /k "%PYTHON_CMD% -m http.server 4173 --bind 127.0.0.1"

for /L %%I in (1,1,12) do (
    call :probe_duduq
    if not errorlevel 1 goto OPEN_NEW
    >nul ping 127.0.0.1 -n 2
)

echo.
echo ========================================
echo DuduQ - não foi possível iniciar o teste
echo ========================================
echo.
echo O servidor local não respondeu em 127.0.0.1:4173.
echo Verifique a janela do servidor para detalhes.
echo.
echo Pressione qualquer tecla para fechar.
echo ========================================
pause >nul
exit /b 1

:OPEN_NEW
echo.
echo Servidor iniciado. Abrindo a central de teste do Year 3...
start "" "%HOME_URL%"
exit /b 0

:OPEN_EXISTING
echo Servidor DuduQ já está ativo na porta 4173.
echo Abrindo a central de teste do Year 3...
start "" "%HOME_URL%"
exit /b 0

:PORT_OCCUPIED
echo.
echo ========================================
echo DuduQ - porta 4173 indisponível
echo ========================================
echo.
echo A porta 4173 já está em uso, mas não foi possível confirmar
echo que ela pertence ao servidor local do DuduQ Year 3.
echo.
echo Nenhum processo foi encerrado.
echo Feche o programa que estiver usando a porta 4173 e tente novamente.
echo.
echo Pressione qualquer tecla para fechar.
echo ========================================
pause >nul
exit /b 1

:NO_PYTHON
echo.
echo ========================================
echo DuduQ — não foi possível iniciar o teste
echo ========================================
echo.
echo Python não foi encontrado neste computador.
echo.
echo Instale/ative Python ou utilize outro servidor HTTP local.
echo.
echo Pressione qualquer tecla para fechar.
echo ========================================
pause >nul
exit /b 1

:find_python
where py >nul 2>&1
if not errorlevel 1 (
    py -c "import sys" >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_CMD=py"
        exit /b 0
    )
)

where python >nul 2>&1
if not errorlevel 1 (
    python -c "import sys" >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_CMD=python"
        exit /b 0
    )
)

exit /b 1

:probe_duduq
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%HOME_URL%' -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match 'duduq-year3-test-home') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%

:port_in_use
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$c = New-Object System.Net.Sockets.TcpClient; try { $a = $c.BeginConnect('127.0.0.1',4173,$null,$null); if ($a.AsyncWaitHandle.WaitOne(500) -and $c.Connected) { exit 0 } else { exit 1 } } catch { exit 1 } finally { $c.Close() }" >nul 2>&1
exit /b %errorlevel%
