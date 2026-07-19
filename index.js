const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Diretorio gravavel para dados de runtime (uploads, sessao do WhatsApp, logs,
// body.json). Quando instalado, o app fica em C:\Program Files\... que e
// somente-leitura sem admin; entao usamos o userData do Electron (passado via
// env pelo electron-main.js). Em desenvolvimento cai no __dirname mesmo.
const dataDir = process.env.USER_DATA_DIR || __dirname;
try {
    fs.mkdirSync(dataDir, { recursive: true });
} catch (e) {
    console.error('Falha ao preparar diretorio de dados:', e.message);
}

// Função para encontrar o executável do Chromium
function getChromiumPath() {
    try {
        console.log('=== PROCURANDO CHROMIUM ===');
        console.log('__dirname:', __dirname);
        console.log('process.cwd():', process.cwd());
        console.log('process.resourcesPath:', process.resourcesPath);
        
        // Tenta o caminho padrão do Puppeteer primeiro (desenvolvimento)
        try {
            const defaultPath = puppeteer.executablePath();
            if (fs.existsSync(defaultPath)) {
                console.log('✅ Usando Puppeteer padrão:', defaultPath);
                return defaultPath;
            }
        } catch (e) {
            console.log('Puppeteer padrão não disponível');
        }
        
        // Lista de possíveis localizações
        const possiblePaths = [
            path.join(__dirname, '.chromium-cache'),
            path.join(process.cwd(), '.chromium-cache'),
            process.resourcesPath ? path.join(process.resourcesPath, 'app', '.chromium-cache') : null,
            process.resourcesPath ? path.join(process.resourcesPath, '.chromium-cache') : null,
            // Caminho relativo ao executável — cobre instalações via NSIS
            path.join(path.dirname(process.execPath), 'resources', 'app', '.chromium-cache'),
        ].filter(p => p !== null);
        
        console.log('Verificando locais:', possiblePaths);
        
        // Procura recursivamente por chrome.exe
        const findChrome = (dir) => {
            try {
                if (!fs.existsSync(dir)) {
                    console.log('❌ Não existe:', dir);
                    return null;
                }
                
                console.log('🔍 Procurando em:', dir);
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        const found = findChrome(fullPath);
                        if (found) return found;
                    } else if (file === 'chrome.exe' || file === 'chromium.exe') {
                        console.log('✅ CHROMIUM ENCONTRADO:', fullPath);
                        return fullPath;
                    }
                }
            } catch (e) {
                console.error('Erro ao procurar em:', dir, e.message);
            }
            return null;
        };
        
        // Tenta cada local possível
        for (const chromiumPath of possiblePaths) {
            const chromePath = findChrome(chromiumPath);
            if (chromePath) return chromePath;
        }
        
        console.error('❌ CHROMIUM NÃO ENCONTRADO EM NENHUM LOCAL!');
        console.error('Locais verificados:', possiblePaths);
        throw new Error(
            'Chromium não encontrado.\n\n' +
            'Locais verificados:\n' +
            possiblePaths.map(p => '  ' + p).join('\n') + '\n\n' +
            'Soluções:\n' +
            '  1. Reinstale o aplicativo com o instalador mais recente\n' +
            '  2. Adicione a pasta de instalação como exceção no antivírus\n' +
            '  3. Verifique se o Windows Firewall não está bloqueando o Chromium\n' +
            '  4. Execute o instalador como Administrador'
        );
    } catch (error) {
        console.error('❌ ERRO AO PROCURAR CHROMIUM:', error);
        throw error;
    }
}

function logErrorDetalhado(contexto, err) {
    const linha = `[${new Date().toISOString()}] ${contexto}: ${err && err.stack ? err.stack : err}`;
    // Também imprime no console (stdout / DevTools) para acesso rápido.
    console.log(linha);
    try {
        fs.appendFileSync(path.join(dataDir, 'erro-detalhado.log'), linha + '\n');
    } catch {
        // ignora falha ao gravar log
    }
}

const upload = multer({ dest: path.join(dataDir, 'uploads') });

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

    let chatId = numberResult._serialized;

    // O WhatsApp migrou contatos para "LID" (@lid). O getNumberId pode retornar
    // um @lid, e enviar direto para @lid FALHA (mensagem não sai, ack -1).
    // Converte o @lid de volta para o telefone (@c.us) usando o mapeamento
    // interno da lib (mesmo mecanismo usado na expulsão de participantes).
    if (chatId.endsWith('@lid')) {
        try {
            const pn = await client.pupPage.evaluate((lid) => {
                try {
                    const createWid = window.require('WAWebWidFactory').createWid;
                    const { toPn } = window.require('WAWebLidMigrationUtils');
                    const phoneWid = toPn(createWid(lid));
                    return phoneWid ? phoneWid._serialized : null;
                } catch (_) { return null; }
            }, chatId);
            if (pn) chatId = pn;
        } catch (_) { /* tenta fallback abaixo */ }

        // Se a conversão não deu certo, tenta o telefone digitado como @c.us.
        if (chatId.endsWith('@lid')) {
            chatId = `${digits}@c.us`;
        }
    }

    return chatId;
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
    authStrategy: new LocalAuth({ dataPath: path.join(dataDir, '.wwebjs_auth') }), // salva sessão em pasta gravavel
    // type 'none': usa a versão ATUAL do WhatsApp Web (ao vivo) e NÃO grava
    // cache em disco. Fixar versão antiga fazia o sendMessage "resolver" sem
    // entregar; o default 'local' tentaria gravar em C:\Program Files (só leitura).
    webVersionCache: { type: 'none' },
    puppeteer: {
        headless: true, // roda sem abrir tela
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: getChromiumPath()
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

client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado');
    logErrorDetalhado('DIAG disconnected', String(reason));
    isConnected = false;
    isSyncing = false;
});

// DIAGNÓSTICO: registra a evolução do ack (confirmação) das mensagens enviadas.
// ack: -1=erro, 0=pendente(relogio), 1=enviado ao servidor, 2=entregue, 3=lido.
// Se nunca chegar ack >= 1, a mensagem não saiu do dispositivo.
client.on('message_ack', (msg, ack) => {
    try {
        logErrorDetalhado('DIAG ack', `msgId=${msg && msg.id ? msg.id._serialized : '?'} ack=${ack} to=${msg ? msg.to : '?'}`);
    } catch (_) {}
});

client.initialize();

// Busca os chats um a um, ignorando qualquer conversa que a lib não
// consiga serializar (ex: Meta AI, canais e comunidades novas) em vez de
// derrubar a lista inteira como o client.getChats() original faz com Promise.all.
async function getChatsResilientes() {
    return await client.pupPage.evaluate(async () => {
        const chatModels = window.require('WAWebCollections').Chat.getModelsArray();
        const resultados = [];
        for (const chat of chatModels) {
            try {
                const model = await window.WWebJS.getChatModel(chat);
                resultados.push(model);
            } catch (e) {
                // ignora conversas que a lib não sabe processar
            }
        }
        return resultados;
    });
}

// Status endpoint
app.get('/status', (req, res) => {
    res.json({ connected: isConnected, qr: currentQR, syncing: isSyncing });
});

// Listar todos os grupos
app.get('/groups', async (req, res) => {
    try {
        const chats = await getChatsResilientes();
        const grupos = chats.filter(c => c.isGroup).map(c => c.name).sort();
        res.json({ grupos });
    } catch (err) {
        logErrorDetalhado('GET /groups', err);
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
        const chats = await getChatsResilientes();
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
        logErrorDetalhado('POST /extract-members', err);
        res.status(500).json({ erro: err.toString() });
    }
});

app.post('/send', upload.single('media'), async (req, res) => {
    const tipo = req.body.tipo === 'numeros' ? 'numeros' : 'grupos';
    const grupos = parseJsonArray(req.body.grupos);
    const numeros = parseJsonArray(req.body.numeros);
    const mensagem = req.body.mensagem || '';
    const file = req.file;

    // Suporta múltiplas mensagens por destino. A UI envia 'mensagens' (JSON
    // array); mantém compatibilidade com 'mensagem' (única).
    let mensagens = parseJsonArray(req.body.mensagens)
        .map(m => String(m == null ? '' : m))
        .filter(m => m.trim().length > 0);
    if (mensagens.length === 0 && mensagem.trim().length > 0) {
        mensagens = [mensagem];
    }

    const destinos = tipo === 'numeros' ? numeros : grupos;

    // Salva no body.json
    const bodyPath = path.join(dataDir, 'body.json');
    fs.writeFileSync(bodyPath, JSON.stringify({ tipo, grupos, numeros, mensagens, media: file ? file.originalname : null }, null, 2));

    // Prepara mídia se enviada
    let media = null;
    if (file) {
        const fileData = fs.readFileSync(file.path).toString('base64');
        media = new MessageMedia(file.mimetype, fileData, file.originalname);
    }

    // Envia todas as mensagens (e a mídia, se houver) para um chat, com um
    // atraso aleatório de 1-5s ANTES de cada mensagem. A mídia vai na primeira
    // mensagem como legenda; as demais seguem como texto.
    const randDelay = () => Math.floor(Math.random() * 4000) + 1000;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    async function enviarPara(chatId) {
        const enviarUma = async (conteudo, opts) => {
            const msg = await client.sendMessage(chatId, conteudo, opts);
            logErrorDetalhado('DIAG enviado', `chatId=${chatId} msgId=${msg && msg.id ? msg.id._serialized : 'SEM-ID'} ackInicial=${msg ? msg.ack : 'n/a'} temMsg=${!!msg}`);
            return msg;
        };
        if (media) {
            await sleep(randDelay());
            await enviarUma(media, { caption: mensagens[0] || undefined });
            for (let i = 1; i < mensagens.length; i++) {
                await sleep(randDelay());
                await enviarUma(mensagens[i]);
            }
        } else {
            for (const msg of mensagens) {
                await sleep(randDelay());
                await enviarUma(msg);
            }
        }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const widInfo = (client.info && client.info.wid) ? client.info.wid._serialized : 'SEM-INFO';
        logErrorDetalhado('DIAG /send inicio', `connected=${isConnected} minhaConta=${widInfo} tipo=${tipo} destinos=${JSON.stringify(destinos)} qtdMensagens=${mensagens.length} mensagens=${JSON.stringify(mensagens)}`);

        const chats = await getChatsResilientes();
        const total = destinos.length;
        let enviados = 0;

        for (const destino of destinos) {
            if (tipo === 'grupos') {
                const nome = String(destino || '').trim();
                const nomeNorm = nome.normalize('NFC').toLowerCase();
                const chat = chats.find(c => c.isGroup && c.name && c.name.trim().normalize('NFC').toLowerCase() === nomeNorm);

                if (chat) {
                    await enviarPara(chat.id._serialized);

                    enviados++;
                    console.log(`Enviado para ${chat.name} (${mensagens.length} msg)`);
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
            logErrorDetalhado('DIAG numero', `numero=${numero} chatIdResolvido=${chatId || 'NULL'}`);

            if (!chatId) {
                enviados++;
                console.log(`Número inválido ou não encontrado no WhatsApp: ${numero}`);
                res.write(`data: ${JSON.stringify({ current: enviados, total, destino: numero, tipo, erro: 'Número inválido ou não encontrado no WhatsApp' })}\n\n`);
                continue;
            }

            await enviarPara(chatId);

            enviados++;
            console.log(`Enviado para ${numero} -> ${chatId} (${mensagens.length} msg)`);
            res.write(`data: ${JSON.stringify({ current: enviados, total, destino: numero, tipo })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true, enviados, total })}\n\n`);
        res.end();

    } catch (err) {
        logErrorDetalhado('POST /send', err);
        res.write(`data: ${JSON.stringify({ error: err.toString() })}\n\n`);
        res.end();
    } finally {
        // Limpa arquivo temporário
        if (file) {
            fs.unlink(file.path, () => {});
        }
    }
});

// Logout do WhatsApp
app.post('/logout', async (req, res) => {
    try {
        // Desconecta e destroi o cliente
        try {
            await client.logout();
            await client.destroy();
        } catch (e) {
            console.log('Erro ao desconectar/destruir cliente:', e.message);
        }
        
        // Apaga os arquivos de autenticação
        const authPath = path.join(dataDir, '.wwebjs_auth');
        const cachePath = path.join(dataDir, '.wwebjs_cache');
        
        function removeDir(dirPath) {
            if (fs.existsSync(dirPath)) {
                fs.readdirSync(dirPath).forEach(file => {
                    const filePath = path.join(dirPath, file);
                    if (fs.lstatSync(filePath).isDirectory()) {
                        removeDir(filePath);
                    } else {
                        fs.unlinkSync(filePath);
                    }
                });
                fs.rmdirSync(dirPath);
            }
        }
        
        removeDir(authPath);
        removeDir(cachePath);
        
        isConnected = false;
        isSyncing = false;
        currentQR = null;
        
        // Reinicializa o cliente para gerar um novo QR code
        client.initialize();
        
        res.json({ sucesso: true });
    } catch (err) {
        logErrorDetalhado('POST /logout', err);
        res.status(500).json({ erro: err.toString() });
    }
});

// ============================================================================
// Funções portadas da versão com gestão de grupos: buscar por número,
// expulsar/banir (grupos e comunidades), lista de banidos e trancar/destrancar.
// Adaptadas para usar getChatsResilientes() e dataDir (pasta gravável).
// ============================================================================

const BANIDOS_FILE = path.join(dataDir, 'banidos.json');

function readBanidos() {
    try {
        if (fs.existsSync(BANIDOS_FILE)) {
            return JSON.parse(fs.readFileSync(BANIDOS_FILE, 'utf8'));
        }
    } catch (_) {}
    return { banidos: [] };
}

function writeBanidos(data) {
    fs.writeFileSync(BANIDOS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Compara os últimos 8 dígitos para tolerar o 9° dígito e variações de DDI/DDD
function numbersMatch(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length >= 8 && b.length >= 8) {
        return a.slice(-8) === b.slice(-8);
    }
    return false;
}

// Mapa { subGroupId → communityRootId } via pupPage
async function getCommunityMap() {
    try {
        return await client.pupPage.evaluate(() => {
            try {
                const WAWebCollections = window.require('WAWebCollections');
                const chatStore = WAWebCollections.Chat || WAWebCollections.WAWebChatCollection;
                const models = chatStore?.getModelsArray?.()
                    || chatStore?.models
                    || Array.from(chatStore?.values?.() || []);
                const map = {};
                for (const chat of models) {
                    if (!chat.isGroup) continue;
                    const gm = chat.groupMetadata;
                    if (!gm) continue;
                    const lp = (gm.get ? gm.get('linkedParent') : undefined)
                        ?? gm.__x_linkedParent
                        ?? gm.linkedParent;
                    if (lp) {
                        const chatId = chat.id?._serialized;
                        const parentId = typeof lp === 'string' ? lp : lp?._serialized;
                        if (chatId && parentId) map[chatId] = parentId;
                    }
                }
                return map;
            } catch (_) { return {}; }
        });
    } catch (_) { return {}; }
}

// Sub-grupos cobertos pela comunidade raiz são pulados no ban
function deduplicateCommunityBans(detalhes) {
    const groupIds = new Set(detalhes.map(g => g.groupId));
    const communityRootsInList = new Set(
        detalhes
            .filter(g => g.communityId && groupIds.has(g.communityId))
            .map(g => g.communityId)
    );
    const toBan = [], skipped = [];
    for (const g of detalhes) {
        if (g.communityId && communityRootsInList.has(g.communityId)) {
            skipped.push(g);
        } else {
            toBan.push(g);
        }
    }
    return { toBan, skipped };
}

// Remoção direta via pupPage (suporta grupos normais e comunidades)
async function removeParticipantDirect(chatId, participantId) {
    return await client.pupPage.evaluate(async ({ chatId, participantId }) => {
        const createWid = window.require('WAWebWidFactory').createWid;
        const { toPn } = window.require('WAWebLidMigrationUtils');

        try {
            const chatWid = createWid(chatId);
            const GM = window.require('WAWebCollections').GroupMetadata ||
                window.require('WAWebCollections').WAWebGroupMetadataCollection;
            await GM.update(chatWid);
        } catch (_) {}

        const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
        const gm = chat?.groupMetadata;
        if (!gm) throw new Error('groupMetadata indisponível');

        const targetSuffix = participantId.replace(/@\w+$/, '').replace(/\D/g, '').slice(-8);

        // Caminho 1: grupos normais
        const collection = gm.participants;
        const allModels = collection?.models || Array.from(collection?.values?.() || []);

        if (allModels.length > 0) {
            let found = null;
            for (const p of allModels) {
                const rawId = typeof p.id === 'string' ? p.id : (p.id?._serialized || '');
                if (rawId === participantId) { found = p; break; }
                if (rawId.includes('@lid')) {
                    try {
                        const phoneWid = toPn(createWid(rawId));
                        if (phoneWid) {
                            const phoneId = phoneWid._serialized;
                            if (phoneId === participantId) { found = p; break; }
                            if (targetSuffix.length === 8) {
                                const pNum = phoneId.replace(/@\w+$/, '').replace(/\D/g, '');
                                if (pNum.slice(-8) === targetSuffix) { found = p; break; }
                            }
                        }
                    } catch (_) {}
                }
                if (targetSuffix.length === 8) {
                    const pNum = rawId.replace(/@\w+$/, '').replace(/\D/g, '');
                    if (pNum.length >= 8 && pNum.slice(-8) === targetSuffix) { found = p; break; }
                }
            }
            if (!found) throw new Error('Participante não encontrado no grupo');
            await window.require('WAWebModifyParticipantsGroupAction').removeParticipants(chat, [found]);
            return { status: 200 };
        }

        // Caminho 2: comunidades (LINKED_ANNOUNCEMENT_GROUP)
        const sm = gm.serialize?.();
        const serializedParticipants = sm?.participants || [];
        if (serializedParticipants.length === 0) {
            throw new Error('Sem participantes na comunidade (não é admin ou metadados não carregados)');
        }

        let targetSp = null;
        for (const sp of serializedParticipants) {
            const spId = sp.id;
            const phoneWid = toPn(spId);
            const phoneId = phoneWid?._serialized || '';
            if (phoneId === participantId) { targetSp = sp; break; }
            if (targetSuffix.length === 8 && phoneId) {
                const pNum = phoneId.replace(/@\w+$/, '').replace(/\D/g, '');
                if (pNum.slice(-8) === targetSuffix) { targetSp = sp; break; }
            }
            const rawId = spId?._serialized || '';
            if (rawId === participantId) { targetSp = sp; break; }
            if (targetSuffix.length === 8) {
                const pNum = rawId.replace(/@\w+$/, '').replace(/\D/g, '');
                if (pNum.length >= 8 && pNum.slice(-8) === targetSuffix) { targetSp = sp; break; }
            }
        }
        if (!targetSp) throw new Error('Participante não encontrado na comunidade');

        const widToGroupJid = window.require('WAWebWidToJid').widToGroupJid;
        const widToUserJid  = window.require('WAWebWidToJid').widToUserJid;
        const groupWid = createWid(chatId);
        const iqTo = widToGroupJid(groupWid);
        const participantJid = widToUserJid(targetSp.id);
        const rpcResult = await window.require('WASmaxGroupsRemoveParticipantsRPC')
            .sendRemoveParticipantsRPC({ participantArgs: [{ participantJid }], iqTo });

        if (rpcResult?.name === 'RemoveParticipantsResponseClientError' ||
            rpcResult?.name === 'RemoveParticipantsResponseServerError') {
            const code = rpcResult?.value?.errorRemoveParticipantsClientErrors?.value?.code
                || rpcResult?.value?.errorRemoveParticipantsServerErrors?.value?.code;
            const text = rpcResult?.value?.errorRemoveParticipantsClientErrors?.value?.text
                || rpcResult?.value?.errorRemoveParticipantsServerErrors?.value?.text
                || 'erro desconhecido';
            if (code === 401) throw new Error('Bot não é admin da comunidade');
            throw new Error(`Comunidade recusou: ${text} (${code})`);
        }

        return { status: 200 };
    }, { chatId, participantId });
}

// Buscar em quais grupos um número está (retorna gruposDetalhes para expulsão)
app.post('/find-groups-by-number', async (req, res) => {
    const numeros = Array.isArray(req.body.numeros)
        ? req.body.numeros
        : parseJsonArray(req.body.numeros);

    if (numeros.length === 0) {
        return res.status(400).json({ erro: 'Informe ao menos um número' });
    }

    try {
        const chats = await getChatsResilientes();
        const grupos = chats.filter(c => c.isGroup || c.isCommunity);

        const gruposComParticipantes = [];
        for (const grupo of grupos) {
            try {
                const groupChat = await client.getChatById(grupo.id._serialized);
                const participantes = Array.isArray(groupChat.participants) ? groupChat.participants : [];
                gruposComParticipantes.push({ nome: grupo.name, groupId: grupo.id._serialized, participantes });
            } catch (_) {}
        }

        const communityMap = await getCommunityMap();

        const results = [];
        for (const rawNumero of numeros) {
            const numero = normalizePhone(rawNumero);
            if (!numero) {
                results.push({ numero: rawNumero, grupos: [], gruposDetalhes: [], invalido: true });
                continue;
            }

            const gruposDoNumero = [];
            const gruposDetalhes = [];
            for (const { nome, groupId, participantes } of gruposComParticipantes) {
                const participante = participantes.find(p =>
                    numbersMatch(extractParticipantNumber(p), numero)
                );
                if (participante) {
                    gruposDoNumero.push(nome);
                    const participantId = participante.id._serialized
                        || (participante.id.user ? `${participante.id.user}@c.us` : null);
                    if (participantId) {
                        gruposDetalhes.push({ nome, groupId, participantId, communityId: communityMap[groupId] || null });
                    }
                }
            }

            results.push({ numero, grupos: gruposDoNumero, gruposDetalhes });
        }

        res.json({ totalGrupos: gruposComParticipantes.length, results });
    } catch (err) {
        logErrorDetalhado('POST /find-groups-by-number', err);
        res.status(500).json({ erro: err.toString() });
    }
});

// Expulsar participantes dos grupos encontrados
app.post('/expulsar', async (req, res) => {
    const { entries } = req.body;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!Array.isArray(entries) || entries.length === 0) {
        res.write(`data: ${JSON.stringify({ tipo: 'erro', erro: 'Nenhuma entrada para expulsar' })}\n\n`);
        res.end();
        return;
    }

    let expulsos = 0, erros = 0;
    for (const entry of entries) {
        const detalhes = Array.isArray(entry.gruposDetalhes) ? entry.gruposDetalhes : [];
        const { toBan, skipped } = deduplicateCommunityBans(detalhes);
        for (const g of skipped) {
            res.write(`data: ${JSON.stringify({ tipo: 'progresso', numero: entry.numero, grupo: g.nome, sucesso: true, pulado: true })}\n\n`);
        }
        for (const g of toBan) {
            try {
                await removeParticipantDirect(g.groupId, g.participantId);
                expulsos++;
                res.write(`data: ${JSON.stringify({ tipo: 'progresso', numero: entry.numero, grupo: g.nome, sucesso: true })}\n\n`);
            } catch (e) {
                erros++;
                res.write(`data: ${JSON.stringify({ tipo: 'progresso', numero: entry.numero, grupo: g.nome, sucesso: false, erro: e.message })}\n\n`);
            }
        }
    }
    res.write(`data: ${JSON.stringify({ tipo: 'done', expulsos, erros })}\n\n`);
    res.end();
});

// Banidos — CRUD
app.get('/banidos', (req, res) => {
    res.json(readBanidos());
});

app.post('/banidos/salvar', (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ erro: 'Nenhum dado para salvar' });
    }
    const data = readBanidos();
    for (const entry of entries) {
        const idx = data.banidos.findIndex(b => b.numero === entry.numero);
        const record = {
            numero: entry.numero,
            grupos: entry.grupos || [],
            motivo: entry.motivo || '',
            dataVerificacao: new Date().toISOString()
        };
        if (idx >= 0) {
            data.banidos[idx] = record;
        } else {
            data.banidos.push(record);
        }
    }
    writeBanidos(data);
    res.json({ sucesso: true, total: data.banidos.length });
});

app.delete('/banidos/:numero', (req, res) => {
    const numero = decodeURIComponent(req.params.numero);
    const data = readBanidos();
    data.banidos = data.banidos.filter(b => b.numero !== numero);
    writeBanidos(data);
    res.json({ sucesso: true });
});

// Trancar / Destrancar grupos (somente admins podem enviar)
app.post('/group-manage', async (req, res) => {
    const grupos = Array.isArray(req.body.grupos)
        ? req.body.grupos
        : parseJsonArray(req.body.grupos);
    const acao = req.body.acao; // 'lock' ou 'unlock'

    if (grupos.length === 0) {
        return res.status(400).json({ erro: 'Informe ao menos um grupo' });
    }
    if (acao !== 'lock' && acao !== 'unlock') {
        return res.status(400).json({ erro: 'Ação inválida' });
    }

    try {
        const chats = await getChatsResilientes();
        const results = [];

        for (const nomeGrupo of grupos) {
            const nome = String(nomeGrupo || '').trim();
            const nomeNorm = nome.normalize('NFC').toLowerCase();
            const chat = chats.find(c => c.isGroup && c.name && c.name.trim().normalize('NFC').toLowerCase() === nomeNorm);

            if (!chat) {
                results.push({ nome, status: 'nao_encontrado' });
                continue;
            }

            try {
                const groupChat = await client.getChatById(chat.id._serialized);
                await groupChat.setMessagesAdminsOnly(acao === 'lock');
                results.push({ nome: chat.name, status: 'ok' });
            } catch (e) {
                results.push({ nome: chat.name, status: 'erro', detalhe: e.message });
            }
        }

        res.json({ results });
    } catch (err) {
        logErrorDetalhado('POST /group-manage', err);
        res.status(500).json({ erro: err.toString() });
    }
});

// Diagnóstico: acesse http://localhost:1414/diag no navegador (ou via console:
// fetch('/diag').then(r=>r.text()).then(console.log)) para ver o log de envios,
// resolução de números (@lid -> @c.us), ack das mensagens, etc.
app.get('/diag', (req, res) => {
    try {
        const logPath = path.join(dataDir, 'erro-detalhado.log');
        const conteudo = fs.existsSync(logPath)
            ? fs.readFileSync(logPath, 'utf8')
            : '(sem registros ainda — envie algo para gerar diagnóstico)';
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(conteudo);
    } catch (err) {
        res.status(500).send(String(err));
    }
});

// Limpa o log de diagnóstico (GET /diag/limpar)
app.get('/diag/limpar', (req, res) => {
    try {
        fs.writeFileSync(path.join(dataDir, 'erro-detalhado.log'), '');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send('log de diagnóstico limpo');
    } catch (err) {
        res.status(500).send(String(err));
    }
});

// servidor
app.listen(1414, () => {
    console.log('API rodando em http://localhost:1414');
});