const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Criar arquivo de log
const logFile = path.join(app.getPath('userData'), 'app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(...args) {
    const message = args.join(' ');
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console.log(message);
    logStream.write(logMessage);
}

log('=== INICIANDO APLICACAO ===');
log('App path:', app.getAppPath());
log('User data:', app.getPath('userData'));
log('Exe path:', app.getPath('exe'));
log('Resource path:', process.resourcesPath);

let mainWindow;

// Detectar se está executando em ambiente empacotado
const isDev = !app.isPackaged;
log('Ambiente desenvolvimento:', isDev);
log('App empacotado:', app.isPackaged);

function createWindow() {
    const iconPath = path.join(__dirname, 'logo.png');
    const preloadPath = path.join(__dirname, 'preload.js');
    
    mainWindow = new BrowserWindow({
        width: 500,
        height: 800,
        show: true, // Mostrar imediatamente
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath
        }
    });

    // Remover menu
    mainWindow.setMenuBarVisibility(false);

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log('Falha ao carregar:', errorCode, errorDescription);
        setTimeout(() => {
            if (mainWindow) {
                mainWindow.loadURL('http://localhost:1414');
            }
        }, 2000);
    });

    mainWindow.loadURL('http://localhost:1414');

    mainWindow.on('closed', function () {
        mainWindow = null;
        app.quit();
    });
}

function startServer() {
    log('=== INICIANDO SERVIDOR EXPRESS ===');
    log('Diretorio:', __dirname);
    
    // Carregar o servidor Express diretamente no processo principal
    try {
        require('./index.js');
        log('Servidor carregado com sucesso!');
    } catch (error) {
        log('ERRO ao carregar servidor:', error.message);
        log('Stack:', error.stack);
        throw error;
    }
}

// ── Validação de dependências e permissões de rede ────────────────────────────

/**
 * Busca chrome.exe ou chromium.exe recursivamente dentro de `dir`.
 * Retorna o caminho completo ou null se não encontrado.
 */
function findChromiumExe(dir) {
    try {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    const found = findChromiumExe(fullPath);
                    if (found) return found;
                } else if (entry === 'chrome.exe' || entry === 'chromium.exe') {
                    return fullPath;
                }
            } catch (e) { /* ignora erros de permissão em sub-pastas */ }
        }
    } catch (e) { /* ignora pasta inacessível */ }
    return null;
}

/**
 * Lista todos os locais onde o .chromium-cache pode estar,
 * cobrindo execução em desenvolvimento e no instalador empacotado.
 */
function getChromiumCandidatePaths() {
    const candidates = [
        path.join(__dirname, '.chromium-cache'),
        process.resourcesPath
            ? path.join(process.resourcesPath, 'app', '.chromium-cache')
            : null,
        path.join(path.dirname(process.execPath), 'resources', 'app', '.chromium-cache'),
        path.join(process.cwd(), '.chromium-cache'),
    ];
    return candidates.filter(Boolean);
}

/**
 * Verifica se o Chromium está presente.
 * Se não estiver, exibe um diálogo de erro com instruções e encerra o app.
 * Retorna true se o Chromium foi encontrado, false caso contrário.
 */
async function validateChromium() {
    const candidates = getChromiumCandidatePaths();
    log('Verificando Chromium nos locais:', candidates.join(' | '));

    for (const candidatePath of candidates) {
        const chromePath = findChromiumExe(candidatePath);
        if (chromePath) {
            log('Chromium validado:', chromePath);
            return true;
        }
    }

    log('ERRO CRITICO: Chromium nao encontrado em nenhum local candidato');
    log('Locais verificados:', candidates.join(' | '));

    const { dialog } = require('electron');
    await dialog.showMessageBox({
        type: 'error',
        title: 'Bot Envio WhatsApp — Componente não encontrado',
        message: 'Navegador interno (Chromium) não encontrado',
        detail:
            'O Chromium é necessário para conectar ao WhatsApp Web e gerar o QR Code.\n\n' +
            'Possíveis causas:\n' +
            '  • Antivírus removeu os arquivos do Chromium\n' +
            '  • Instalação incompleta ou corrompida\n' +
            '  • Arquivos excluídos manualmente\n\n' +
            'Como corrigir:\n' +
            '  1. Adicione a pasta de instalação como exceção no antivírus\n' +
            '  2. Reinstale o aplicativo com o instalador mais recente\n' +
            '  3. Se o problema persistir, entre em contato com o suporte\n\n' +
            'Locais verificados:\n' +
            candidates.map(p => '  ' + p).join('\n'),
        buttons: ['Fechar'],
        defaultId: 0,
    });

    app.quit();
    return false;
}

/**
 * Tenta adicionar regras no Windows Firewall para o Chromium encontrado.
 * Opera em modo silencioso (melhor esforço): falha sem crash se não houver
 * permissão de administrador. O instalador NSIS já faz isso com privilégios
 * completos; esta função serve de fallback para execução em modo dev ou
 * re-instalações manuais.
 */
function setupFirewallRule() {
    if (process.platform !== 'win32') return;

    try {
        const candidates = getChromiumCandidatePaths();
        let chromePath = null;
        for (const candidatePath of candidates) {
            chromePath = findChromiumExe(candidatePath);
            if (chromePath) break;
        }

        if (!chromePath) {
            log('setupFirewallRule: Chromium nao localizado, pulando');
            return;
        }

        const ruleName = 'Bot Envio WhatsApp - Chromium';

        // Verifica se a regra já existe para não duplicar
        try {
            const out = execSync(`netsh advfirewall firewall show rule name="${ruleName}"`, {
                encoding: 'utf8',
                stdio: 'pipe',
            });
            if (out && out.length > 20) {
                log('Regra de firewall ja existe, nenhuma acao necessaria');
                return;
            }
        } catch (e) {
            // Regra não existe — cria abaixo
        }

        execSync(
            `netsh advfirewall firewall add rule name="${ruleName}" dir=out action=allow program="${chromePath}" enable=yes profile=any`,
            { stdio: 'pipe' }
        );
        execSync(
            `netsh advfirewall firewall add rule name="${ruleName}" dir=in  action=allow program="${chromePath}" enable=yes profile=any`,
            { stdio: 'pipe' }
        );
        log('Regra de firewall adicionada com sucesso:', chromePath);
    } catch (e) {
        // Falha silenciosa — normal quando o processo não é admin
        log('setupFirewallRule (nao-critica):', e.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────


// ── Sistema de Licença ────────────────────────────────────────────────────────

/**
 * Exibe a janela de ativação e aguarda o usuário inserir uma chave válida.
 * Retorna uma Promise que resolve com true (ativado) ou false (janela fechada).
 */
function showActivationWindow(deviceId) {
    return new Promise((resolve) => {
        const activationWin = new BrowserWindow({
            width: 500,
            height: 800,
            resizable: false,
            center: true,
            title: 'Ativação — Bot Envio WhatsApp',
            icon: path.join(__dirname, 'logo.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload-activation.js'),
            },
        });

        activationWin.setMenuBarVisibility(false);
        activationWin.loadFile(path.join(__dirname, 'public', 'activation.html'));

        const { validateLicense, saveLicense } = require('./src/license');
        let activatedSuccessfully = false;

        ipcMain.handleOnce('license:validate', async (event, key) => {
            try {
                log('Validando chave:', key);
                const result = await validateLicense(key, deviceId);
                log('Resultado da validação:', JSON.stringify(result));

                if (result.valid) {
                    saveLicense(key);
                    activatedSuccessfully = true;
                    // Aguarda um momento para o usuário ver a mensagem de sucesso
                    setTimeout(() => {
                        if (!activationWin.isDestroyed()) activationWin.close();
                        resolve(true);
                    }, 1500);
                }

                return result;
            } catch (err) {
                log('Erro na validação de licença:', err.message);
                return { valid: false, message: 'Erro de conexão. Verifique sua internet e tente novamente.' };
            }
        });

        activationWin.on('closed', () => {
            // Remove o handler caso a janela seja fechada antes de ativar
            try { ipcMain.removeHandler('license:validate'); } catch { /* já removido */ }
            // Só resolve false se o usuário fechou manualmente (sem ativar)
            if (!activatedSuccessfully) {
                resolve(false);
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────

app.on('ready', async () => {
    try {
        log('=== BOT ENVIO WHATSAPP INICIANDO ===');
        log('App empacotado:', !isDev);
        log('Versao Electron:', process.versions.electron);
        log('Versao Node:', process.versions.node);

        // 1. Garante que o Chromium está presente; encerra com mensagem clara se não estiver
        const chromiumOk = await validateChromium();
        if (!chromiumOk) return;

        // 2. Tenta configurar permissão de rede (melhor esforço, requer admin)
        setupFirewallRule();

        // 3. Verificação de licença (obrigatória, sem modo offline)
        const { loadLicense, validateLicense, clearLicense } = require('./src/license');
        const { getDeviceId } = require('./src/device-id');

        const deviceId = getDeviceId();
        log('Device ID:', deviceId);

        let savedKey = loadLicense();
        log('Chave salva localmente:', savedKey ? 'sim' : 'não');

        if (savedKey) {
            log('Verificando licença salva contra servidor...');
            try {
                const licenseResult = await validateLicense(savedKey, deviceId);
                if (!licenseResult.valid) {
                    log('Licença inválida/revogada:', licenseResult.message);
                    clearLicense();
                    savedKey = null;

                    const { dialog } = require('electron');
                    await dialog.showMessageBox({
                        type: 'warning',
                        title: 'Licença Inválida',
                        message: 'Sua licença não é mais válida.',
                        detail: licenseResult.message + '\n\nVocê precisará inserir uma nova chave de licença.',
                        buttons: ['Continuar'],
                    });
                } else {
                    log('Licença válida!');
                }
            } catch (err) {
                log('Erro ao verificar licença:', err.message);
                const { dialog } = require('electron');
                await dialog.showMessageBox({
                    type: 'error',
                    title: 'Erro de Conexão',
                    message: 'Não foi possível verificar sua licença.',
                    detail: 'Verifique sua conexão com a internet e tente novamente.\n\nDetalhes: ' + err.message,
                    buttons: ['Fechar'],
                });
                app.quit();
                return;
            }
        }

        if (!savedKey) {
            log('Abrindo janela de ativação...');
            const activated = await showActivationWindow(deviceId);
            if (!activated) {
                log('Usuário fechou a janela de ativação sem ativar.');
                app.quit();
                return;
            }
            log('Licença ativada com sucesso!');
        }

        // 4. Iniciar servidor no mesmo processo
        startServer();
        
        // Aguardar um pouco para o servidor inicializar
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        log('Criando janela...');
        createWindow();
        log('Aplicativo iniciado com sucesso!');
    } catch (error) {
        console.error('╔════════════════════════════════════════════════════╗');
        console.error('║   ERRO FATAL AO INICIAR                           ║');
        console.error('╚════════════════════════════════════════════════════╝');
        console.error(error);
        
        const { dialog } = require('electron');
        dialog.showErrorBox(
            'Erro ao Iniciar',
            'Não foi possível iniciar o servidor.\n\n' +
            'Detalhes: ' + error.message
        );
        app.quit();
    }
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
