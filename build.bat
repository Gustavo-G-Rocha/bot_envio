@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

if defined MSYSTEM (
    exit /b 1
)

:: ── Se nao foi chamado com argumento SILENT, relanca escondido ──────────────────
if /i "%~1" NEQ "SILENT" (
    powershell -NoProfile -WindowStyle Hidden -Command ^
        "Start-Process 'cmd.exe' -ArgumentList ('/c \"%~f0\" SILENT') -WindowStyle Hidden"
    exit /b
)
:: ────────────────────────────────────────────────────────────────────────────────

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 exit /b 1

if not exist "node_modules\electron\cli.js" (
    call :install_deps
    if errorlevel 1 exit /b 1
    if not exist "node_modules\electron\cli.js" exit /b 1
)

start "" "node_modules\electron\dist\electron.exe" .
exit /b 0



:: ── Subrotina de instalacao ───────────────────────────────────────────────────
:install_deps
echo [INFO] Encerrando processos que possam bloquear arquivos...
taskkill /f /im electron.exe >nul 2>nul
taskkill /f /im node.exe >nul 2>nul

call :force_delete_node_modules

echo [INFO] Instalando dependencias...
call npm install --include=dev
if exist "node_modules\electron\cli.js" exit /b 0

echo [AVISO] Primeira tentativa falhou. Limpando cache npm e tentando novamente...
call npm cache clean --force >nul 2>nul
call :force_delete_node_modules
call npm install --include=dev
if exist "node_modules\electron\cli.js" exit /b 0

exit /b 1

:force_delete_node_modules
if not exist "node_modules" exit /b 0
echo [INFO] Removendo node_modules (pode demorar alguns segundos)...
:: Tenta via PowerShell primeiro (mais confiavel que rmdir no Windows)
powershell -NoProfile -Command ^
    "Remove-Item -Path '%~dp0node_modules' -Recurse -Force -ErrorAction SilentlyContinue"
if not exist "node_modules" exit /b 0
:: Fallback: robocopy para esvaziar depois rmdir
set "_empty=%TEMP%\_bot_empty_%RANDOM%"
mkdir "%_empty%" >nul 2>nul
robocopy "%_empty%" "node_modules" /mir /njh /njs /nfl /ndl >nul 2>nul
rmdir /s /q "%_empty%" >nul 2>nul
rmdir /s /q "node_modules" >nul 2>nul
exit /b 0
