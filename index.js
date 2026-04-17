const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, 'uploads') });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let currentQR = null;
let isConnected = false;
let isSyncing = false;

// Cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(), // salva sessão
    puppeteer: {
        headless: true, // roda sem abrir tela
        args: ['--no-sandbox']
    }
});

// QR Code
client.on('qr', async qr => {
    console.log('Escaneie o QR Code:');
    qrcode.generate(qr, { small: true });
    currentQR = await QRCode.toDataURL(qr);
});

// Autenticado (QR escaneado, sincronizando chats)
client.on('authenticated', () => {
    console.log('WhatsApp autenticado, sincronizando...');
    isSyncing = true;
    currentQR = null;
});

// Pronto
client.on('ready', () => {
    console.log('WhatsApp conectado!');
    isConnected = true;
    isSyncing = false;
    currentQR = null;
});

client.on('disconnected', () => {
    console.log('WhatsApp desconectado');
    isConnected = false;
    isSyncing = false;
});

client.initialize();

// Status endpoint
app.get('/status', (req, res) => {
    res.json({ connected: isConnected, qr: currentQR, syncing: isSyncing });
});

// Listar todos os grupos
app.get('/groups', async (req, res) => {
    try {
        const chats = await client.getChats();
        const grupos = chats.filter(c => c.isGroup).map(c => c.name).sort();
        res.json({ grupos });
    } catch (err) {
        res.status(500).json({ erro: err.toString() });
    }
});

// 🔥 Endpoint envio
app.post('/send', upload.single('media'), async (req, res) => {
    const grupos = JSON.parse(req.body.grupos);
    const mensagem = req.body.mensagem || '';
    const file = req.file;

    // Salva no body.json
    const bodyPath = path.join(__dirname, 'body.json');
    fs.writeFileSync(bodyPath, JSON.stringify({ grupos, mensagem, media: file ? file.originalname : null }, null, 2));

    // Prepara mídia se enviada
    let media = null;
    if (file) {
        const fileData = fs.readFileSync(file.path).toString('base64');
        media = new MessageMedia(file.mimetype, fileData, file.originalname);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const chats = await client.getChats();
        const total = grupos.length;
        let enviados = 0;

        for (let nome of grupos) {
            const nomeNorm = nome.trim().normalize('NFC').toLowerCase();
            const chat = chats.find(c => c.isGroup && c.name && c.name.trim().normalize('NFC').toLowerCase() === nomeNorm);

            if (chat) {
                const delay = Math.floor(Math.random() * 4000) + 1000;
                await new Promise(resolve => setTimeout(resolve, delay));

                if (media) {
                    await client.sendMessage(chat.id._serialized, media, { caption: mensagem || undefined });
                } else {
                    await client.sendMessage(chat.id._serialized, mensagem);
                }

                enviados++;
                console.log(`Enviado para ${chat.name} (espera: ${delay}ms)`);
                res.write(`data: ${JSON.stringify({ current: enviados, total, grupo: chat.name })}\n\n`);
            } else {
                enviados++;
                console.log(`Grupo não encontrado: ${nome}`);
                res.write(`data: ${JSON.stringify({ current: enviados, total, grupo: nome, erro: 'Grupo não encontrado' })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ done: true, enviados, total })}\n\n`);
        res.end();

    } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.toString() })}\n\n`);
        res.end();
    } finally {
        // Limpa arquivo temporário
        if (file) {
            fs.unlink(file.path, () => {});
        }
    }
});

// servidor
app.listen(3000, () => {
    console.log('API rodando em http://localhost:3000');
});