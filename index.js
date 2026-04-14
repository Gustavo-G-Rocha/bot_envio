const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

// Cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(), // salva sessão
    puppeteer: {
        headless: true, // roda sem abrir tela
        args: ['--no-sandbox']
    }
});

// QR Code
client.on('qr', qr => {
    console.log('Escaneie o QR Code:');
    qrcode.generate(qr, { small: true });
});

// Pronto
client.on('ready', () => {
    console.log('WhatsApp conectado!');
});

client.initialize();

// 🔥 Endpoint envio
app.post('/send', async (req, res) => {
    const { grupos, mensagem } = req.body;

    try {
        const chats = await client.getChats();

        for (let nome of grupos) {
            const nomeNorm = nome.trim().normalize('NFC').toLowerCase();
            const chat = chats.find(c => c.isGroup && c.name && c.name.trim().normalize('NFC').toLowerCase() === nomeNorm);

            if (chat) {
                await client.sendMessage(chat.id._serialized, mensagem);
                console.log(`Enviado para ${chat.name}`);
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