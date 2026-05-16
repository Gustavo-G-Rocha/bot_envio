@echo off
setlocal enabledelayedexpansion
title Gerador de Instalador
cls
echo.
echo ========================================================================
echo     GERADOR DE INSTALADOR - BOT ENVIO WHATSAPP
echo ========================================================================
echo.

cd /d "%~dp0"

:: Deve ficar antes de todo npm install para que o Chromium baixe na pasta do projeto
set PUPPETEER_CACHE_DIR=%CD%\.chromium-cache
set PUPPETEER_SKIP_DOWNLOAD=false
set PUPPETEER_DOWNLOAD_HOST=https://storage.googleapis.com

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Node.js nao instalado!
    pause
    exit /b 1
)
echo OK - Node.js instalado

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: NPM nao encontrado!
    pause
    exit /b 1
)
echo OK - NPM instalado
echo.

echo Removendo arquivos antigos...
if exist "node_modules" rmdir /s /q node_modules 2>nul
if exist ".chromium-cache" rmdir /s /q .chromium-cache 2>nul
if exist "dist" rmdir /s /q dist 2>nul
if exist ".wwebjs_auth" rmdir /s /q .wwebjs_auth 2>nul
if exist "package-lock.json" del /f /q package-lock.json 2>nul
echo OK - Limpeza concluida
echo.

echo Instalando dependencias...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERRO ao instalar dependencias!
    pause
    exit /b 1
)
echo OK - Dependencias instaladas
echo.

echo Baixando Chromium...
:: Verifica se o npm install ja baixou via .puppeteerrc.cjs
dir .chromium-cache /s /b 2>nul | find /i "chrome.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo OK - Chromium ja presente, pulando download redundante
    goto :chromium_ok
)
:: Nao encontrado: forca reinstalacao do puppeteer para disparar o download
if exist "node_modules\puppeteer" rmdir /s /q node_modules\puppeteer 2>nul
call npm install puppeteer --force
if %ERRORLEVEL% NEQ 0 (
    echo Tentando copiar do cache global...
    set GLOBAL_CACHE=%USERPROFILE%\.cache\puppeteer
    if exist "!GLOBAL_CACHE!\chrome" (
        xcopy /E /I /Y /Q "!GLOBAL_CACHE!" ".chromium-cache\"
    ) else (
        echo ERRO: Chromium nao encontrado e sem cache global disponivel
        pause
        exit /b 1
    )
)
:chromium_ok
:: Verificacao obrigatoria - se nao tiver chrome.exe o instalador nao funcionara
dir .chromium-cache /s /b 2>nul | find /i "chrome.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERRO CRITICO: chrome.exe NAO encontrado!
    echo O antivirus pode ter removido o arquivo durante o download.
    echo Adicione esta pasta como excecao no antivirus e tente novamente.
    pause
    exit /b 1
)
echo OK - Chromium baixado e verificado
echo.

echo Verificando dependencias...
if not exist "node_modules\electron" (
    echo ERRO: electron nao instalado
    pause
    exit /b 1
)
if not exist "node_modules\electron-builder" (
    echo ERRO: electron-builder nao instalado
    pause
    exit /b 1
)
if not exist "node_modules\whatsapp-web.js" (
    echo ERRO: whatsapp-web.js nao instalado
    pause
    exit /b 1
)
if not exist "node_modules\puppeteer" (
    echo ERRO: puppeteer nao instalado
    pause
    exit /b 1
)
echo OK - Todas dependencias instaladas
echo.

echo Gerando instalador...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERRO durante build
    pause
    exit /b 1
)
echo.

echo ========================================================================
echo     CONCLUIDO!
echo ========================================================================
echo.

if exist "dist\*.exe" (
    echo Instalador gerado com sucesso!
    for %%F in (dist\*.exe) do (
        echo Arquivo: %%~nxF
        set BYTES=%%~zF
        set /a SIZE_MB=!BYTES!/1048576
        echo Tamanho: !SIZE_MB! MB
    )
) else (
    echo ERRO: Nenhum exe gerado
)
echo.

pause
