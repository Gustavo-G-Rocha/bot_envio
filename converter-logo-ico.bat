@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   🎨 Conversor PNG para ICO - Ícone do Instalador        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

if not exist "logo.png" (
    echo ❌ ERRO: Arquivo logo.png não encontrado!
    pause
    exit /b 1
)

echo ✅ logo.png encontrado
echo.
echo 🔄 Convertendo para formato ICO...
echo.

:: Usar PowerShell para converter
powershell -Command ^
    "$img = [System.Drawing.Image]::FromFile('%~dp0logo.png'); ^
     $icon = [System.Drawing.Icon]::FromHandle(([System.Drawing.Bitmap]$img).GetHicon()); ^
     $stream = [System.IO.File]::Create('%~dp0logo.ico'); ^
     $icon.Save($stream); ^
     $stream.Close(); ^
     $img.Dispose()"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Método PowerShell falhou. Tentando método alternativo...
    echo.
    
    :: Instalar e usar conversor npm
    call npm install --no-save png-to-ico 2>nul
    
    if %ERRORLEVEL% EQU 0 (
        node -e "const pngToIco=require('png-to-ico');const fs=require('fs');pngToIco('logo.png').then(buf=>{fs.writeFileSync('logo.ico',buf);console.log('✅ Conversão concluída!');})" 2>nul
        
        if %ERRORLEVEL% NEQ 0 (
            goto manual
        )
    ) else (
        goto manual
    )
)

if exist "logo.ico" (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║   ✅ CONVERSÃO CONCLUÍDA!                                ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 📁 Arquivo criado: logo.ico
    echo.
    echo 📝 Agora atualizando electron-builder.json...
    echo.
    
    :: Atualizar electron-builder.json (será feito manualmente depois)
    echo ✅ Pronto! Agora você pode gerar o instalador com o logo.
    echo.
    pause
    exit /b 0
)

:manual
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   ⚠️  Conversão Automática Falhou                        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 💡 Conversão manual necessária:
echo.
echo    1. Acesse: https://convertio.co/pt/png-ico/
echo    2. Faça upload do logo.png
echo    3. Baixe o logo.ico
echo    4. Salve na pasta: %~dp0
echo.
echo Após converter, execute novamente gerar-executavel.bat
echo.
pause
exit /b 1
