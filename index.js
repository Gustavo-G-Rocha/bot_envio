const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let currentQR = null;
let isConnected = false;

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

// Pronto
client.on('ready', () => {
    console.log('WhatsApp conectado!');
    isConnected = true;
    currentQR = null;
});

client.on('disconnected', () => {
    console.log('WhatsApp desconectado');
    isConnected = false;
});

client.initialize();

// Status endpoint
app.get('/status', (req, res) => {
    res.json({ connected: isConnected, qr: currentQR });
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
app.post('/send', async (req, res) => {
    const { grupos, mensagem } = req.body;

    // Salva no body.json
    const bodyPath = path.join(__dirname, 'body.json');
    fs.writeFileSync(bodyPath, JSON.stringify({ grupos, mensagem }, null, 2));

    try {
        const chats = await client.getChats();

        for (let nome of grupos) {
            const nomeNorm = nome.trim().normalize('NFC').toLowerCase();
            const chat = chats.find(c => c.isGroup && c.name && c.name.trim().normalize('NFC').toLowerCase() === nomeNorm);

            if (chat) {
                const delay = Math.floor(Math.random() * 4000) + 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                await client.sendMessage(chat.id._serialized, mensagem);
                console.log(`Enviado para ${chat.name} (espera: ${delay}ms)`);
            } else {
                console.log(`Grupo não encontrado: ${nome}`);
                const gruposDisponiveis = chats.filter(c => c.isGroup).map(c => c.name);
                console.log('Grupos disponíveis:', gruposDisponiveis);
            }
        }

        res.json({ status: 'Mensagens enviadas' });

    } catch (err) {
        res.status(500).json({ erro: err.toString() });
    }
});

// servidor
app.listen(3000, () => {
    console.log('API rodando em http://localhost:3000');
});