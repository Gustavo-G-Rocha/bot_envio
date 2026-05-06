const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

let mainWindow;
let serverProcess;

// Detectar se está executando em ambiente empacotado
const isDev = !app.isPackaged;

function createWindow() {
    const iconPath = path.join(__dirname, 'logo.png');
    const preloadPath = path.join(__dirname, 'preload.js');
    
    mainWindow = new BrowserWindow({
        width: 500,
        height: 800,
        show: false,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Falha ao carregar:', errorCode, errorDescription);
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

function checkPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️ Porta ${port} já está em uso!`);
                resolve(false);
            } else {
                resolve(true);
            }
        });
        server.once('listening', () => {
            server.close();
            console.log(`✓ Porta ${port} está livre`);
            resolve(true);
        });
        server.listen(port);
    });
}

function startServer() {
    return new Promise(async (resolve, reject) => {
        console.log('='.repeat(60));
        console.log('Iniciando servidor...');
        console.log('isDev:', isDev);
        console.log('process.resourcesPath:', process.resourcesPath);
        console.log('__dirname:', __dirname);
        
        // Verificar se a porta está livre
        const portFree = await checkPortFree(1414);
        if (!portFree) {
            return reject(new Error('Porta 1414 já está em uso. Feche outros processos e tente novamente.'));
        }
        
        // Sem ASAR, os arquivos estão diretamente em resources/app
        const serverPath = path.join(__dirname, 'index.js');
        const workingDir = __dirname;
        
        console.log('Caminho do servidor:', serverPath);
        console.log('Diretório de trabalho:', workingDir);
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(serverPath)) {
            const error = `ERRO CRÍTICO: Arquivo não encontrado!\n` +
                         `Procurado em: ${serverPath}\n` +
                         `Arquivos na pasta:\n` +
                         `${fs.existsSync(workingDir) ? fs.readdirSync(workingDir).join('\n') : 'Pasta não existe!'}`;
            console.error(error);
            return reject(new Error('Arquivo index.js não encontrado'));
        }
        
        console.log('✓ Arquivo index.js encontrado!');
        console.log('Iniciando processo Node.js...');
        
        // Usar o node.exe do Electron
        const nodePath = process.execPath;
        console.log('Node path:', nodePath);
        
        try {
            // Executar node diretamente no index.js
            serverProcess = spawn(nodePath, [serverPath], {
                cwd: workingDir,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    NODE_ENV: 'production',
                    ELECTRON_RUN_AS_NODE: '1'
                },
                windowsHide: true
            });

            console.log('✓ Processo criado com PID:', serverProcess.pid);
        } catch (error) {
            console.error('ERRO ao criar processo:', error);
            return reject(error);
        }

        // Log de saída do servidor
        if (serverProcess.stdout) {
            serverProcess.stdout.on('data', (data) => {
                console.log('[Servidor]', data.toString());
            });
        }

        if (serverProcess.stderr) {
            serverProcess.stderr.on('data', (data) => {
                console.error('[Servidor ERRO]', data.toString());
            });
        }

        serverProcess.on('error', (err) => {
            console.error('Erro no processo do servidor:', err);
            reject(err);
        });

        serverProcess.on('exit', (code, signal) => {
            console.log('Servidor finalizado. Código:', code, 'Sinal:', signal);
            if (code !== 0 && code !== null && mainWindow) {
                console.error('Servidor finalizado com erro');
                app.quit();
            }
        });

        // Aguarda o servidor estar pronto - aumentar timeout
        const tryConnect = (attempts) => {
            const http = require('http');
            console.log(`Tentando conectar... (${41 - attempts}/40)`);
            
            http.get('http://localhost:1414', (res) => {
                console.log('✓ Servidor respondeu! Status:', res.statusCode);
                console.log('='.repeat(60));
                resolve();
            }).on('error', (err) => {
                if (attempts <= 0) {
                    console.error('✗ Servidor não iniciou após 40 tentativas');
                    console.error('Último erro:', err.message);
                    return reject(new Error('Timeout: Servidor não respondeu após 40 segundos.\n\nPossíveis causas:\n- Porta 1414 bloqueada por firewall\n- Dependências do WhatsApp Web não carregaram\n- Processo foi finalizado inesperadamente'));
                }
                setTimeout(() => tryConnect(attempts - 1), 1000);
            });
        };
        
        // Dar mais tempo para o servidor inicializar (WhatsApp Web é pesado)
        setTimeout(() => tryConnect(40), 2000);
    });
}

app.on('ready', async () => {
    try {
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║   Bot Envio WhatsApp - Iniciando...              ║');
        console.log('╚════════════════════════════════════════════════════╝');
        console.log('App empacotado:', !isDev);
        console.log('Versão Electron:', process.versions.electron);
        console.log('Versão Node:', process.versions.node);
        
        await startServer();
        
        console.log('Criando janela...');
        createWindow();
        mainWindow.setMenuBarVisibility(false);
        console.log('✓ Aplicativo iniciado com sucesso!');
    } catch (error) {
        console.error('╔════════════════════════════════════════════════════╗');
        console.error('║   ERRO FATAL AO INICIAR                           ║');
        console.error('╚════════════════════════════════════════════════════╝');
        console.error(error);
        
        const { dialog } = require('electron');
        dialog.showErrorBox(
            'Erro ao Iniciar',
            'Não foi possível iniciar o servidor.\n\n' +
            'Detalhes: ' + error.message + '\n\n' +
            'Verifique se a porta 1414 está livre.'
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

app.on('quit', () => {
    if (serverProcess) {
        console.log('Finalizando servidor...');
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
});
