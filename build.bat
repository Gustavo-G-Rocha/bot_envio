@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

color 0A
title Bot Envio WhatsApp

:check_node
echo ====================================
echo  Bot Envio WhatsApp
echo ====================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale Node.js em:
    echo https://nodejs.org/
    echo.
    echo Depois execute este arquivo novamente.
    pause
    exit /b 1
)

node --version >nul 2>nul
echo [OK] Node.js encontrado
echo.

REM Verifica se node_modules existe
if not exist "node_modules" (
    echo [AVISO] Dependencias nao encontradas
    echo Instalando dependencias (pode demorar alguns minutos)...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    color 0A
    echo [OK] Dependencias instaladas com sucesso
    echo.
)

:menu
cls
color 0A
echo ====================================
echo  Bot Envio WhatsApp
echo ====================================
echo.
echo Escolha uma opcao:
echo.
echo  1 - Iniciar a aplicacao
echo  2 - Compilar para Windows (Instalador + Portable)
echo  3 - Compilar apenas versao Portable (recomendado)
echo  4 - Reinstalar dependencias
echo  5 - Sair
echo.
set /p choice="Digite sua escolha (1-5): "

if "%choice%"=="1" (
    cls
    echo.
    echo Iniciando Bot Envio WhatsApp...
    echo A aplicacao abrira em alguns segundos...
    echo Pressione CTRL+C para parar
    echo.
    timeout /t 2 /nobreak
    call npm run dev
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo [ERRO] Falha ao iniciar a aplicacao!
        pause
    )
    goto menu
)

if "%choice%"=="2" (
    cls
    echo.
    echo Compilando para Windows (Instalador + Portable)...
    echo Isso pode demorar alguns minutos...
    echo.
    call npm run build-win
    if %ERRORLEVEL% EQU 0 (
        color 0A
        echo.
        echo [OK] Build concluido com sucesso!
        echo Os arquivos estao em: dist\
        echo.
        pause
    ) else (
        color 0C
        echo.
        echo [ERRO] Falha ao compilar!
        pause
    )
    goto menu
)

if "%choice%"=="3" (
    cls
    echo.
    echo Compilando versao Portable...
    echo Isso pode demorar alguns minutos...
    echo.
    call npm run build-portable
    if %ERRORLEVEL% EQU 0 (
        color 0A
        echo.
        echo [OK] Build concluido com sucesso!
        echo O arquivo esta em: dist\
        echo.
        pause
    ) else (
        color 0C
        echo.
        echo [ERRO] Falha ao compilar!
        pause
    )
    goto menu
)

if "%choice%"=="4" (
    cls
    echo.
    echo Reinstalando dependencias...
    echo Isso pode demorar alguns minutos...
    echo.
    rmdir /s /q node_modules 2>nul
    call npm install
    if %ERRORLEVEL% EQU 0 (
        color 0A
        echo.
        echo [OK] Dependencias reinstaladas com sucesso!
        pause
    ) else (
        color 0C
        echo.
        echo [ERRO] Falha ao reinstalar dependencias!
        pause
    )
    goto menu
)

if "%choice%"=="5" (
    exit /b 0
)

color 0C
echo [ERRO] Opcao invalida!
timeout /t 2 /nobreak
goto menu
