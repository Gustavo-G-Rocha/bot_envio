@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cls
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                                                                           ║
echo ║        🚀 GERADOR DE INSTALADOR COMPLETO - BOT ENVIO WHATSAPP 🚀        ║
echo ║                                                                           ║
echo ║     Este script faz TUDO automaticamente:                                ║
echo ║     ✅ Limpa arquivos antigos                                            ║
echo ║     ✅ Instala todas as dependências                                     ║
echo ║     ✅ Baixa Chromium completo (~300MB)                                  ║
echo ║     ✅ Gera instalador GERALZÃO (~500-800MB)                             ║
echo ║                                                                           ║
echo ║     ⏱️  Tempo estimado: 15-30 minutos                                    ║
echo ║     💾 Espaço necessário: ~2GB livres                                    ║
echo ║                                                                           ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo.
echo ⚠️  IMPORTANTE:
echo    - Mantenha a internet conectada
echo    - Não feche esta janela durante o processo
echo    - Aguarde até aparecer "CONCLUÍDO"
echo.
echo.
echo 👉 Pressione qualquer tecla para INICIAR o processo...
echo.
pause >nul
echo.
echo ▶️  INICIANDO...
echo.

cd /d "%~dp0"

:: ── Chromium/Puppeteer: garante download LOCAL antes de qualquer npm install ──
:: Deve ficar aqui, antes de toda operação npm, para que o postinstall
:: do puppeteer (disparado pelo npm install) baixe o Chromium na pasta
:: do projeto e não no perfil global do usuário.
set PUPPETEER_CACHE_DIR=%CD%\.chromium-cache
set PUPPETEER_SKIP_DOWNLOAD=false
set PUPPETEER_DOWNLOAD_HOST=https://storage.googleapis.com
:: ─────────────────────────────────────────────────────────────────────────────

:: Teste se conseguiu mudar para a pasta
if errorlevel 1 (
    echo ❌ ERRO: Não foi possível acessar a pasta do projeto!
    echo    Pasta atual: %CD%
    echo    Pasta esperada: %~dp0
    echo.
    pause
    exit /b 1
)

:: ═══════════════════════════════════════════════════════════════════════════
:: ETAPA 1/6 - VERIFICAÇÕES INICIAIS
:: ═══════════════════════════════════════════════════════════════════════════
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║   ETAPA 1/6 - Verificações Iniciais                                      ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

:: Verifica Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO: Node.js não está instalado!
    echo.
    echo 📥 Instale o Node.js primeiro:
    echo    https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js: OK
node -v
echo.

:: Verifica NPM
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO: NPM não encontrado!
    echo.
    pause
    exit /b 1
)

echo ✅ NPM: OK
npm -v
echo.

:: Verifica espaço em disco
echo 🔍 Verificando espaço em disco...
echo    ✅ Verificação de espaço OK
echo.

echo ✅ Verificações concluídas!
echo.
timeout /t 2 >nul

:: ═══════════════════════════════════════════════════════════════════════════
:: ETAPA 2/6 - LIMPEZA DE PROCESSOS E ARQUIVOS ANTIGOS
:: ═══════════════════════════════════════════════════════════════════════════
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║   ETAPA 2/6 - Limpeza de Processos e Arquivos Antigos                    ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

echo 🧹 Encerrando processos em execução...
taskkill /F /IM "Bot Envio WhatsApp.exe" /T >nul 2>&1
taskkill /F /IM "electron.exe" /T >nul 2>&1
taskkill /F /IM "chrome.exe" /T >nul 2>&1
taskkill /F /IM "node.exe" /T >nul 2>&1
timeout /t 2 >nul
echo    ✅ Processos encerrados
echo.

echo 🗑️  Removendo arquivos antigos...
echo.

if exist "node_modules" (
    echo    📁 Removendo node_modules...
    rmdir /s /q node_modules 2>nul
    echo       ✅ Removido
)

if exist ".chromium-cache" (
    echo    📁 Removendo .chromium-cache...
    rmdir /s /q .chromium-cache 2>nul
    echo       ✅ Removido
)

if exist "dist" (
    echo    📁 Removendo dist antiga...
    rmdir /s /q dist 2>nul
    echo       ✅ Removido
)

if exist ".wwebjs_auth" (
    echo    📁 Removendo sessões antigas do WhatsApp...
    rmdir /s /q .wwebjs_auth 2>nul
    echo       ✅ Removido
)

if exist ".wwebjs_cache" (
    echo    📁 Removendo cache do WhatsApp...
    rmdir /s /q .wwebjs_cache 2>nul
    echo       ✅ Removido
)

if exist "package-lock.json" (
    echo    📄 Removendo package-lock.json...
    del /f /q package-lock.json 2>nul
    echo       ✅ Removido
)

echo.
echo ✅ Limpeza concluída!
timeout /t 2 >nul

:: ═══════════════════════════════════════════════════════════════════════════
:: ETAPA 3/6 - INSTALAÇÃO DE DEPENDÊNCIAS BASE
:: ═══════════════════════════════════════════════════════════════════════════
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║   ETAPA 3/6 - Instalação de Dependências Base                            ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo 📥 Instalando pacotes NPM...
echo    ⏳ Aguarde 3-5 minutos...
echo.

call npm install --loglevel=info

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERRO ao instalar dependências!
    echo.
    echo 💡 Possíveis soluções:
    echo    - Verifique sua conexão com internet
    echo    - Execute este script como Administrador
    echo    - Exclua a pasta node_modules e tente novamente
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Dependências base instaladas com sucesso!
timeout /t 2 >nul

:: ═══════════════════════════════════════════════════════════════════════════
:: ETAPA 4/6 - DOWNLOAD DO CHROMIUM COMPLETO
:: ═══════════════════════════════════════════════════════════════════════════
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║   ETAPA 4/6 - Download do Chromium Completo                               ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo 🌐 Baixando Chromium (~200-300MB)...
echo    ⏳ Esta é a parte mais demorada (5-15 minutos)
echo    📊 Progresso será exibido abaixo:
echo.

:: Verifica se o npm install (ETAPA 3) já baixou o Chromium via .puppeteerrc.cjs
:: Nesse caso pula o download redundante e vai direto para a verificação.
dir .chromium-cache /s /b 2>nul | find /i "chrome.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Chromium já presente — baixado automaticamente na ETAPA 3!
    echo    Pulando download redundante.
    goto :chromium_verificar
)

echo ⬇️  Chromium não detectado. Forçando download...
echo.

:: Remove instalação antiga do Puppeteer para disparar o postinstall novamente
if exist "node_modules\puppeteer" (
    echo 🗑️  Removendo Puppeteer antigo...
    rmdir /s /q node_modules\puppeteer 2>nul
    echo.
)

echo 📥 Iniciando download do Chromium (~200-300MB)...
echo.

call npm install puppeteer --force --loglevel=info

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Erro ao baixar via npm install.
    echo.
    echo 🔄 Tentando método alternativo (cache global do Puppeteer)...
    echo.

    set GLOBAL_CACHE=%USERPROFILE%\.cache\puppeteer
    if exist "%GLOBAL_CACHE%\chrome" (
        echo 📋 Chromium encontrado no cache global!
        echo 📁 Copiando para pasta do projeto...
        echo.
        xcopy /E /I /Y /Q "%GLOBAL_CACHE%" ".chromium-cache\"
        if %ERRORLEVEL% EQU 0 (
            echo ✅ Chromium copiado com sucesso!
        ) else (
            echo ❌ Falha ao copiar Chromium do cache global.
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo ❌ Chromium não foi baixado e não há cache global disponível!
        echo.
        echo 💡 Soluções:
        echo    - Verifique sua conexão com a internet
        echo    - Desative o antivírus temporariamente
        echo    - Execute como Administrador
        echo    - Verifique acesso a: storage.googleapis.com
        echo.
        pause
        exit /b 1
    )
)

:chromium_verificar
echo.
echo 🔍 Verificando chrome.exe no pacote...
echo.

dir .chromium-cache /s /b 2>nul | find /i "chrome.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO CRÍTICO: chrome.exe NÃO foi encontrado!
    echo.
    echo    O instalador gerado NÃO funcionará em outros PCs!
    echo.
    echo 💡 Possíveis causas:
    echo    - Antivírus bloqueou/removeu o chrome.exe durante o download
    echo    - Download incompleto — verifique espaço em disco
    echo    - Proxy corporativo bloqueou storage.googleapis.com
    echo.
    echo 💡 Soluções:
    echo    1. Adicione esta pasta como exceção no antivírus
    echo    2. Desative o antivírus e execute novamente
    echo    3. Execute como Administrador
    echo.
    pause
    exit /b 1
)

echo ✅ chrome.exe encontrado e verificado!
dir .chromium-cache /s /b | find /i "chrome.exe"
echo.
echo ✅ Chromium completo pronto para empacotamento!
timeout /t 2 >nul

:: ═══════════════════════════════════════════════════════════════════════════
:: ETAPA 5/6 - VERIFICAÇÃO FINAL DAS DEPENDÊNCIAS
:: ═══════════════════════════════════════════════════════════════════════════
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║   ETAPA 5/6 - Verificação Final das Dependências                         ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

echo 🔍 Verificando arquivos essenciais...
echo.

:: Verifica arquivos do projeto
if not exist "index.js" (
    echo ❌ ERRO: index.js não encontrado!
    pause
    exit /b 1
)
echo ✅ index.js

if not exist "electron-main.js" (
    echo ❌ ERRO: electron-main.js não encontrado!
    pause
    exit /b 1
)
echo ✅ electron-main.js

if not exist "package.json" (
    echo ❌ ERRO: package.json não encontrado!
    pause
    exit /b 1
)
echo ✅ package.json

if not exist "electron-builder.json" (
    echo ❌ ERRO: electron-builder.json não encontrado!
    pause
    exit /b 1
)
echo ✅ electron-builder.json

:: Verifica node_modules principais
if not exist "node_modules\express" (
    echo ❌ ERRO: express não instalado!
    pause
    exit /b 1
)
echo ✅ express

if not exist "node_modules\whatsapp-web.js" (
    echo ❌ ERRO: whatsapp-web.js não instalado!
    pause
    exit /b 1
)
echo ✅ whatsapp-web.js

if not exist "node_modules\puppeteer" (
    echo ❌ ERRO: puppeteer não instalado!
    pause
    exit /b 1
)
echo ✅ puppeteer

if not exist "node_modules\electron" (
    echo ❌ ERRO: electron não instalado!
    pause
    exit /b 1
)
echo ✅ electron

if not exist "node_modules\electron-builder" (
    echo ❌ ERRO: electron-builder não instalado!
    pause
    exit /b 1
)
echo ✅ electron-builder

echo.
echo ✅ Todas as dependências verificadas!
timeout /t 2 >nul

:: ═══════════════════════════════════════════════════════════════════════════
:: ETAPA 6/6 - GERAÇÃO DO INSTALADOR COMPLETO
:: ═══════════════════════════════════════════════════════════════════════════
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║   ETAPA 6/6 - Geração do Instalador GERALZÃO                             ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo 📦 Gerando instalador completo...
echo    ⏳ Aguarde 5-10 minutos (empacotando TUDO)
echo    📊 Tamanho esperado: 500-800MB
echo.

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERRO durante a geração do instalador!
    echo.
    echo 💡 Possíveis soluções:
    echo    - Verifique espaço em disco (~2GB livres)
    echo    - Feche outros programas
    echo    - Execute como Administrador
    echo    - Delete a pasta 'dist' e execute novamente
    echo.
    pause
    exit /b 1
)

:: ═══════════════════════════════════════════════════════════════════════════
:: FINALIZAÇÃO E RELATÓRIO
:: ═══════════════════════════════════════════════════════════════════════════
echo.
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                                                                           ║
echo ║                    ✅ INSTALADOR GERADO COM SUCESSO! ✅                  ║
echo ║                                                                           ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo.

if exist "dist\*.exe" (
    echo 📦 INSTALADOR GERADO:
    echo.
    echo ╔═══════════════════════════════════════════════════════════════════════════╗
    
    for %%F in (dist\*.exe) do (
        echo ║
        echo ║   📁 Arquivo: %%~nxF
        
        :: Calcula tamanho em MB
        set BYTES=%%~zF
        set /a SIZE_MB=!BYTES!/1048576
        
        echo ║   📊 Tamanho: !SIZE_MB! MB aprox.
        echo ║   📊 Bytes: %%~zF
        echo ║
        echo ║   📂 Local: %CD%\dist\
        echo ║
    )
    
    echo ╚═══════════════════════════════════════════════════════════════════════════╝
    echo.
    echo.
    echo ✅ O QUE ESTE INSTALADOR INCLUI:
    echo.
    echo    ✅ Aplicação Electron completa
    echo    ✅ Servidor Express
    echo    ✅ WhatsApp Web.js
    echo    ✅ Chromium navegador COMPLETO (~300MB)
    echo    ✅ Todas as bibliotecas Node.js
    echo    ✅ Todas as dependências nativas
    echo    ✅ Runtime completo
    echo.
    echo ╔═══════════════════════════════════════════════════════════════════════════╗
    echo ║                                                                           ║
    echo ║   🎯 ESTE INSTALADOR FUNCIONA EM QUALQUER WINDOWS 11 LIMPO!             ║
    echo ║                                                                           ║
    echo ║   ✅ Não precisa Node.js instalado                                       ║
    echo ║   ✅ Não precisa Chrome/Edge instalado                                   ║
    echo ║   ✅ Não precisa Visual C++                                              ║
    echo ║   ✅ Não precisa .NET Framework                                          ║
    echo ║   ✅ Não precisa NADA! 100%% STANDALONE!                                  ║
    echo ║                                                                           ║
    echo ╚═══════════════════════════════════════════════════════════════════════════╝
    echo.
    echo.
    echo 📤 COMO DISTRIBUIR:
    echo.
    echo    1. Vá para a pasta: %CD%\dist
    echo    2. Envie APENAS o arquivo .exe para seus usuários
    echo    3. Eles executam o instalador
    echo    4. Pronto! ✅
    echo.
    echo.
    echo 🧪 TESTAR AGORA:
    echo.
    echo    cd dist
    echo    start "Bot Envio WhatsApp Setup 1.0.0.exe"
    echo.
    echo.
    echo 📂 Abrindo pasta de saída...
    start "" "%CD%\dist"
    echo.

) else (
    echo ❌ ERRO: Nenhum arquivo .exe foi gerado em dist\
    echo.
    echo 💡 Verifique os erros acima e tente novamente.
    echo.
)

echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                                                                           ║
echo ║                         🎉 PROCESSO CONCLUÍDO! 🎉                        ║
echo ║                                                                           ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo.
echo 👉 Pressione qualquer tecla para fechar...
pause >nul
exit /b 0
