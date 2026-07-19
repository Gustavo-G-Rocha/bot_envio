// Prepara a pasta .chromium-cache antes do electron-builder empacotar o exe.
//
// Dois problemas que este script resolve:
//  1) Em um PC novo o puppeteer.executablePath() aponta para
//     C:\Users\<user>\.cache\puppeteer (que nao existe) e o app nao acha o
//     navegador. Aqui garantimos que exista um Chromium em .chromium-cache.
//  2) Como o projeto tem DOIS puppeteers (o do package.json e o aninhado no
//     whatsapp-web.js), o npm install baixa DUAS versoes de Chrome para
//     .chromium-cache. Este script poda para deixar apenas UMA versao, para
//     o instalador nao levar navegador duplicado.
//
// Roda automaticamente antes do build (ver script "build" no package.json).

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const destDir = path.join(__dirname, '..', '.chromium-cache');
const chromeDir = path.join(destDir, 'chrome');

function jaTemChrome(dir) {
    if (!fs.existsSync(dir)) return false;
    for (const nome of fs.readdirSync(dir)) {
        const full = path.join(dir, nome);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            if (jaTemChrome(full)) return true;
        } else if (nome === 'chrome.exe' || nome === 'chromium.exe') {
            return true;
        }
    }
    return false;
}

// Converte "win64-146.0.7680.31" em [146,0,7680,31] para comparar versoes.
// Pega o trecho depois do ultimo "-" para nao confundir com o "64" de "win64".
function parseVersao(nomePasta) {
    const versaoStr = nomePasta.split('-').pop();
    const m = versaoStr.match(/\d+(?:\.\d+)*/);
    if (!m) return [0];
    return m[0].split('.').map(n => parseInt(n, 10) || 0);
}

function versaoMaior(a, b) {
    const va = parseVersao(a);
    const vb = parseVersao(b);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
        const x = va[i] || 0;
        const y = vb[i] || 0;
        if (x !== y) return x > y;
    }
    return false;
}

function garantirChromium() {
    if (jaTemChrome(destDir)) {
        return;
    }

    let chromeExe;
    try {
        chromeExe = puppeteer.executablePath();
    } catch (e) {
        console.error('❌ Nao consegui localizar o Chromium do Puppeteer:', e.message);
        console.error('   Rode "npx puppeteer browsers install chrome" e tente de novo.');
        process.exit(1);
    }

    if (!fs.existsSync(chromeExe)) {
        console.error('❌ Chromium do Puppeteer nao encontrado em:', chromeExe);
        console.error('   Rode "npx puppeteer browsers install chrome" e tente de novo.');
        process.exit(1);
    }

    const srcDir = path.dirname(chromeExe);
    const destChromeDir = path.join(chromeDir, path.basename(path.dirname(srcDir)), path.basename(srcDir));

    console.log('📦 Copiando Chromium para o pacote...');
    fs.mkdirSync(path.dirname(destChromeDir), { recursive: true });
    fs.cpSync(srcDir, destChromeDir, { recursive: true });
    console.log('✅ Chromium copiado para .chromium-cache.');
}

// Deixa apenas UMA versao de Chrome e remove o chrome-headless-shell (o app
// usa o chrome.exe completo via executablePath, nao precisa do headless-shell).
function podarParaUmChromium() {
    // Remove o chrome-headless-shell inteiro se existir.
    const headlessShell = path.join(destDir, 'chrome-headless-shell');
    if (fs.existsSync(headlessShell)) {
        fs.rmSync(headlessShell, { recursive: true, force: true });
        console.log('🧹 Removido chrome-headless-shell (nao usado).');
    }

    if (!fs.existsSync(chromeDir)) return;

    const versoes = fs.readdirSync(chromeDir)
        .filter(nome => fs.statSync(path.join(chromeDir, nome)).isDirectory());

    if (versoes.length <= 1) {
        console.log(`✅ .chromium-cache com uma unica versao de Chrome: ${versoes[0] || '(nenhuma)'}`);
        return;
    }

    // Escolhe a versao mais nova para manter.
    let manter = versoes[0];
    for (const v of versoes) {
        if (versaoMaior(v, manter)) manter = v;
    }

    for (const v of versoes) {
        if (v !== manter) {
            fs.rmSync(path.join(chromeDir, v), { recursive: true, force: true });
            console.log(`🧹 Removida versao extra de Chrome: ${v}`);
        }
    }
    console.log(`✅ Mantida apenas a versao de Chrome: ${manter}`);
}

function main() {
    garantirChromium();
    podarParaUmChromium();
}

main();
