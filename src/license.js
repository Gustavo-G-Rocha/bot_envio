const https = require('https');
const path = require('path');
const fs = require('fs');

// ─── CONFIGURAÇÃO — PREENCHA ANTES DE FAZER O BUILD ──────────────────────────
// URL gerada ao publicar o apps-script.gs como Web App no Google Apps Script
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby_FD7iAkxj7GkOZgHDCkr-CLEbYuMj5bGqzKTbvCUR22mPEtQF3yrFnpB65sLyk4Dz_Q/exec';

// Mesmo valor definido em VALIDATION_TOKEN no apps-script.gs
const VALIDATION_TOKEN = 'Missioneiro_14@2026';
// ─────────────────────────────────────────────────────────────────────────────

function getLicenseFilePath() {
    try {
        const { app } = require('electron');
        return path.join(app.getPath('userData'), 'license.dat');
    } catch {
        return path.join(require('os').homedir(), '.botenvio_license.dat');
    }
}

/**
 * Faz POST para o Google Apps Script Web App.
 * Trata redirecionamentos automáticos (GAS pode retornar 302).
 */
function postToGAS(url, body, redirectsLeft = 5) {
    return new Promise((resolve, reject) => {
        if (redirectsLeft <= 0) {
            reject(new Error('Muitos redirecionamentos ao conectar com o servidor.'));
            return;
        }

        const postData = JSON.stringify(body);
        const u = new URL(url);
        const isPost = redirectsLeft === 5; // somente na primeira requisição usa POST

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
                res.resume(); // drena o body para liberar o socket
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
                    reject(new Error('Resposta inválida do servidor de licenças.'));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Timeout ao conectar com o servidor de licenças.'));
        });

        if (isPost) req.write(postData);
        req.end();
    });
}

/**
 * Valida a chave contra o Google Apps Script.
 * - Se DISPONIVEL: ativa e registra o device_id.
 * - Se ATIVADA + mesmo device: libera.
 * - Se ATIVADA + device diferente: bloqueia.
 * - Se REVOGADA: bloqueia.
 * Retorna { valid: boolean, message?: string }
 */
async function validateLicense(key, deviceId) {
    if (WEB_APP_URL.startsWith('COLE_')) {
        throw new Error('URL do servidor de licenças não configurada em src/license.js.');
    }

    let result;
    try {
        result = await postToGAS(WEB_APP_URL, {
            action: 'validate',
            token: VALIDATION_TOKEN,
            key,
            deviceId,
        });
    } catch (err) {
        throw new Error('Erro ao conectar com o servidor de licenças: ' + err.message);
    }

    return result;
}

function saveLicense(key) {
    const filePath = getLicenseFilePath();
    fs.writeFileSync(filePath, JSON.stringify({ key }), 'utf8');
}

function loadLicense() {
    try {
        const filePath = getLicenseFilePath();
        if (!fs.existsSync(filePath)) return null;
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data.key || null;
    } catch {
        return null;
    }
}

function clearLicense() {
    try {
        const filePath = getLicenseFilePath();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* ignora */ }
}

module.exports = { validateLicense, saveLicense, loadLicense, clearLicense };
