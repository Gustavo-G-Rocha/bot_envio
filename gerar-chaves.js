/**
 * Gerador de Chaves de Licença — Bot Envio WhatsApp
 *
 * Uso: node gerar-chaves.js <quantidade>
 * Exemplo: node gerar-chaves.js 10
 *
 * Pré-requisitos:
 *   - apps-script.gs já publicado como Web App no Google Apps Script
 *   - WEB_APP_URL e ADMIN_TOKEN preenchidos abaixo
 */

const https = require('https');

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
// URL gerada ao publicar o apps-script.gs como Web App
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby_FD7iAkxj7GkOZgHDCkr-CLEbYuMj5bGqzKTbvCUR22mPEtQF3yrFnpB65sLyk4Dz_Q/exec';

// Mesmo valor de ADMIN_TOKEN no apps-script.gs (NUNCA coloque no executável)
const ADMIN_TOKEN = '#Gustavo_Rocha_Missao_14*';
// ─────────────────────────────────────────────────────────────────────────────

function postToGAS(url, body, redirectsLeft = 5) {
    return new Promise((resolve, reject) => {
        if (redirectsLeft <= 0) {
            reject(new Error('Muitos redirecionamentos.'));
            return;
        }

        const postData = JSON.stringify(body);
        const u = new URL(url);
        const isPost = redirectsLeft === 5;

        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: isPost ? 'POST' : 'GET',
            headers: isPost ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            } : {},
        };

        const req = https.request(options, (res) => {
            if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                res.resume();
                postToGAS(res.headers.location, body, redirectsLeft - 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error('Resposta inválida do servidor.'));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(60000, () => {
            req.destroy();
            reject(new Error('Timeout ao conectar com o servidor.'));
        });

        if (isPost) req.write(postData);
        req.end();
    });
}

async function main() {
    const quantidade = parseInt(process.argv[2]);
    if (!quantidade || quantidade < 1 || quantidade > 500) {
        console.error('Uso: node gerar-chaves.js <quantidade>');
        console.error('Exemplo: node gerar-chaves.js 10');
        console.error('Máximo: 500 por vez');
        process.exit(1);
    }

    if (WEB_APP_URL.startsWith('COLE_')) {
        console.error('Erro: Preencha WEB_APP_URL neste arquivo antes de usar.');
        process.exit(1);
    }

    if (ADMIN_TOKEN.startsWith('COLE_')) {
        console.error('Erro: Preencha ADMIN_TOKEN neste arquivo antes de usar.');
        process.exit(1);
    }

    console.log(`Conectando ao servidor...`);

    let result;
    try {
        result = await postToGAS(WEB_APP_URL, {
            action: 'generate',
            token: ADMIN_TOKEN,
            quantidade,
        });
    } catch (err) {
        console.error('Erro de conexão:', err.message);
        process.exit(1);
    }

    if (!result.success) {
        console.error('Erro do servidor:', result.message || JSON.stringify(result));
        process.exit(1);
    }

    console.log(`\n${quantidade} chave(s) gerada(s) e adicionada(s) à planilha:\n`);
    result.keys.forEach((k) => console.log('  ' + k));
    console.log();
}

main().catch((err) => {
    console.error('\nErro inesperado:', err.message);
    process.exit(1);
});

