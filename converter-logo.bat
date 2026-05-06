@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   🎨 Conversor de Logo PNG para ICO                      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

if not exist "logo.png" (
    echo ❌ ERRO: Arquivo logo.png não encontrado!
    echo.
    echo Certifique-se que o arquivo logo.png está na raiz do projeto.
    echo.
    pause
    exit /b 1
)

echo ✅ Arquivo logo.png encontrado
echo.
echo 📦 Instalando conversor de imagens...
echo.

call npm install --no-save png-to-ico >nul 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao instalar conversor
    pause
    exit /b 1
)

echo.
echo 🔄 Convertendo logo.png para logo.ico...
echo.

node -e "const pngToIco = require('png-to-ico'); const fs = require('fs'); pngToIco('logo.png').then(buf => { fs.writeFileSync('logo.ico', buf); console.log('✅ Conversão concluída!'); }).catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erro ao converter
    echo.
    echo 💡 Alternativa: Use um conversor online:
    echo    https://convertio.co/pt/png-ico/
    echo.
    pause
    exit /b 1
)

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   ✅ Logo convertido com sucesso!                        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📁 Arquivo criado: logo.ico
echo.
echo Agora você pode gerar o instalador com o logo personalizado.
echo.
pause
