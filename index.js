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

function parseJsonArray(rawValue) {
    if (!rawValue) return [];
    try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function normalizePhone(rawValue) {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    if (value.endsWith('@c.us')) {
        return value.replace('@c.us', '').replace(/\D/g, '');
    }

    const waMeMatch = value.match(/wa\.me\/(\d+)/i);
    if (waMeMatch) {
        return waMeMatch[1];
    }

    const digits = value.replace(/\D/g, '');
    return digits || null;
}

async function resolveNumberChatId(rawNumber) {
    const digits = normalizePhone(rawNumber);
    if (!digits) return null;

    const numberResult = await client.getNumberId(digits);
    if (!numberResult || !numberResult._serialized) {
        return null;
    }

    return numberResult._serialized;
}

function extractDigitsFromChatId(chatId) {
    const raw = String(chatId || '');
    if (!raw) return null;

    const userPart = raw.split('@')[0];
    const digits = userPart.replace(/\D/g, '');
    return digits || null;
}

function extractParticipantNumber(participant) {
    if (!participant || !participant.id) return null;

    if (typeof participant.id === 'string') {
        return extractDigitsFromChatId(participant.id);
    }

    if (participant.id._serialized) {
        return extractDigitsFromChatId(participant.id._serialized);
    }

    if (participant.id.user) {
        const digits = String(participant.id.user).replace(/\D/g, '');
        return digits || null;
    }

    return null;
}

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

// Extrair membros de grupos para txt
app.post('/extract-members', async (req, res) => {
    const grupos = Array.isArray(req.body.grupos)
        ? req.body.grupos
        : parseJsonArray(req.body.grupos);

    if (grupos.length === 0) {
        return res.status(400).json({ erro: 'Informe ao menos um grupo' });
    }

    try {
        const chats = await client.getChats();
        const numeros = new Set();

        for (const nomeGrupo of grupos) {
            const nome = String(nomeGrupo || '').trim();
            const nomeNorm = nome.normalize('NFC').toLowerCase();
            const chat = chats.find(c => c.isGroup && c.name && c.name.trim().normalize('NFC').toLowerCase() === nomeNorm);

            if (!chat) {
                continue;
            }

            const groupChat = await client.getChatById(chat.id._serialized);
            const participantes = Array.isArray(groupChat.participants) ? groupChat.participants : [];

            for (const participante of participantes) {
                const numero = extractParticipantNumber(participante);
                if (numero) {
                    numeros.add(numero);
                }
            }
        }

        const listaNumeros = Array.from(numeros).sort();
        if (listaNumeros.length === 0) {
            return res.status(404).json({ erro: 'Nenhum número encontrado nos grupos informados' });
        }

        const conteudo = `${listaNumeros.join('\n')}\n`;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="numeros_membros.txt"');
        res.send(conteudo);
    } catch (err) {
        res.status(500).json({ erro: err.toString() });
    }
});

app.post('/send', upload.single('media'), async (req, res) => {
    const tipo = req.body.tipo === 'numeros' ? 'numeros' : 'grupos';
    const grupos = parseJsonArray(req.body.grupos);
    const numeros = parseJsonArray(req.body.numeros);
    const mensagem = req.body.mensagem || '';
    const file = req.file;

    const destinos = tipo === 'numeros' ? numeros : grupos;

    // Salva no body.json
    const bodyPath = path.join(__dirname, 'body.json');
    fs.writeFileSync(bodyPath, JSON.stringify({ tipo, grupos, numeros, mensagem, media: file ? file.originalname : null }, null, 2));

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
        const total = destinos.length;
        let enviados = 0;

        for (const destino of destinos) {
            const delay = Math.floor(Math.random() * 4000) + 1000;

            if (tipo === 'grupos') {
                const nome = String(destino || '').trim();
                const nomeNorm = nome.normalize('NFC').toLowerCase();
                const chat = chats.find(c => c.isGroup && c.name && c.name.trim().normalize('NFC').toLowerCase() === nomeNorm);

                if (chat) {
                    await new Promise(resolve => setTimeout(resolve, delay));

                    if (media) {
                        await client.sendMessage(chat.id._serialized, media, { caption: mensagem || undefined });
                    } else {
                        await client.sendMessage(chat.id._serialized, mensagem);
                    }

                    enviados++;
                    console.log(`Enviado para ${chat.name} (espera: ${delay}ms)`);
                    res.write(`data: ${JSON.stringify({ current: enviados, total, destino: chat.name, tipo })}\n\n`);
                } else {
                    enviados++;
                    console.log(`Grupo não encontrado: ${nome}`);
                    res.write(`data: ${JSON.stringify({ current: enviados, total, destino: nome, tipo, erro: 'Grupo não encontrado' })}\n\n`);
                }
                continue;
            }

            const numero = String(destino || '').trim();
            const chatId = await resolveNumberChatId(numero);

            if (!chatId) {
                enviados++;
                console.log(`Número inválido ou não encontrado no WhatsApp: ${numero}`);
                res.write(`data: ${JSON.stringify({ current: enviados, total, destino: numero, tipo, erro: 'Número inválido ou não encontrado no WhatsApp' })}\n\n`);
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, delay));

            if (media) {
                await client.sendMessage(chatId, media, { caption: mensagem || undefined });
            } else {
                await client.sendMessage(chatId, mensagem);
            }

            enviados++;
            console.log(`Enviado para ${numero} -> ${chatId} (espera: ${delay}ms)`);
            res.write(`data: ${JSON.stringify({ current: enviados, total, destino: numero, tipo })}\n\n`);
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