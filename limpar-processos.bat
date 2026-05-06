@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   🧹 Limpeza de Processos - Bot Envio WhatsApp          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 🔍 Procurando processos do Bot Envio WhatsApp...
echo.

tasklist | findstr /I "Bot Envio" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ⚠️ Processos encontrados! Finalizando...
    echo.
    taskkill /F /IM "Bot Envio WhatsApp.exe" /T >nul 2>&1
    timeout /t 2 >nul
    echo ✅ Processos finalizados
) else (
    echo ✅ Nenhum processo em execução
)

echo.
echo 🔍 Verificando porta 1414...
echo.

netstat -ano | findstr :1414 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ⚠️ Porta 1414 está em uso!
    echo.
    echo Processos usando a porta 1414:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1414') do (
        echo PID: %%a
        tasklist | findstr %%a
        echo.
        choice /c SN /n /m "Deseja finalizar este processo? (S/N): "
        if errorlevel 2 goto skip
        taskkill /F /PID %%a >nul 2>&1
        echo ✅ Processo finalizado
        :skip
    )
) else (
    echo ✅ Porta 1414 está livre
)

echo.
echo 🔍 Procurando processos Node.js...
echo.

tasklist | findstr /I "node.exe" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ⚠️ Processos Node.js encontrados:
    tasklist | findstr /I "node.exe"
    echo.
    echo ⚠️ CUIDADO: Alguns podem ser de outros aplicativos!
    choice /c SN /n /m "Deseja finalizar TODOS os processos Node.js? (S/N): "
    if errorlevel 2 goto end
    taskkill /F /IM node.exe /T >nul 2>&1
    echo ✅ Processos Node.js finalizados
) else (
    echo ✅ Nenhum processo Node.js em execução
)

:end
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   ✅ LIMPEZA CONCLUÍDA                                   ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo Agora você pode:
echo   1. Gerar novo instalador (gerar-executavel.bat)
echo   2. Executar o aplicativo sem conflitos
echo.
pause
