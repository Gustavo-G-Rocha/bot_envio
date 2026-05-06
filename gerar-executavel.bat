@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   🚀 Gerador de Instalador - Bot Envio WhatsApp          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Limpar processos antes de começar
echo 🧹 Limpando processos em execução...
taskkill /F /IM "Bot Envio WhatsApp.exe" /T >nul 2>&1
taskkill /F /IM "electron.exe" /T >nul 2>&1
timeout /t 1 >nul
echo ✅ Limpeza concluída
echo.

:: Verifica se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO: Node.js não está instalado!
    echo.
    echo 📥 Baixe e instale o Node.js em: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js detectado
echo.

:: Verifica se node_modules existe
if not exist "node_modules" (
    echo 📦 Instalando dependências pela primeira vez...
    echo    Isso pode demorar alguns minutos...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
    echo.
)

echo ╔═══════════════════════════════════════════════════════════╗
echo ║   Gerando Instalador NSIS...                             ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo ⏳ Aguarde... Este processo pode demorar alguns minutos.
echo.

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERRO durante o build!
    echo.
    echo 💡 Dicas:
    echo    - Verifique se tem espaço em disco suficiente
    echo    - Feche outros programas e tente novamente
    echo    - Delete a pasta 'dist' e tente de novo
    echo.
    pause
    exit /b 1
)

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   ✅ INSTALADOR GERADO COM SUCESSO!                      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📂 Instalador criado em: dist\
echo.

if exist "dist\*.exe" (
    echo 📦 Arquivo gerado:
    echo.
    for %%F in (dist\*.exe) do echo    ✅ %%~nxF
    echo.
)

echo.
echo 💡 Próximos passos:
echo    1. Teste o instalador em um PC limpo
echo    2. Distribua o arquivo Setup para seus usuários
echo    3. Usuários devem executar e seguir o assistente de instalação
echo.

choice /c SN /n /m "Deseja abrir a pasta 'dist' agora? (S/N): "
if %ERRORLEVEL%==1 (
    start "" "%~dp0dist"
)

echo.
pause
