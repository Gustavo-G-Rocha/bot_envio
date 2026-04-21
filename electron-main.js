const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const spawn = require('child_process').spawn;
const os = require('os');

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadURL('http://localhost:3000');

    mainWindow.webContents.openDevTools({ mode: 'detach' });

    mainWindow.on('closed', function () {
        mainWindow = null;
        if (serverProcess) {
            serverProcess.kill();
        }
    });
}

function startServer() {
    return new Promise((resolve) => {
        const isWindows = os.platform() === 'win32';
        const command = isWindows ? 'node.exe' : 'node';
        
        serverProcess = spawn(command, ['index.js'], {
            cwd: __dirname,
            stdio: 'inherit'
        });

        serverProcess.on('error', (err) => {
            console.error('Erro ao iniciar servidor:', err);
        });

        // Aguarda um pouco para o servidor iniciar
        setTimeout(() => resolve(), 2000);
    });
}

app.on('ready', async () => {
    await startServer();
    createWindow();

    const menu = Menu.buildFromTemplate([
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Sair',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'Exibir',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);
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
        serverProcess.kill();
    }
});
