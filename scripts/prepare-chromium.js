// Copia o Chromium baixado pelo Puppeteer para a pasta .chromium-cache do
// projeto, para que o electron-builder consiga empacotá-lo dentro do exe.
// Sem isso, em um PC novo o puppeteer.executablePath() aponta para
// C:\Users\<user>\.cache\puppeteer (que não existe) e o app não acha o navegador.
//
// Roda automaticamente antes do build (ver scripts "build*" no package.json).
// Se a pasta .chromium-cache já tiver um chrome.exe, não copia de novo.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const destDir = path.join(__dirname, '..', '.chromium-cache');

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

function main() {
    if (jaTemChrome(destDir)) {
        console.log('✅ .chromium-cache já contém o Chromium, nada a copiar.');
        return;
    }

    let chromeExe;
    try {
        chromeExe = puppeteer.executablePath();
    } catch (e) {
        console.error('❌ Não consegui localizar o Chromium do Puppeteer:', e.message);
        console.error('   Rode "npx puppeteer browsers install chrome" e tente de novo.');
        process.exit(1);
    }

    if (!fs.existsSync(chromeExe)) {
        console.error('❌ Chromium do Puppeteer não encontrado em:', chromeExe);
        console.error('   Rode "npx puppeteer browsers install chrome" e tente de novo.');
        process.exit(1);
    }

    // chromeExe = ...\chrome-win64\chrome.exe  -> copia a pasta chrome-win64 inteira
    const srcDir = path.dirname(chromeExe);
    const destChromeDir = path.join(destDir, path.basename(srcDir));

    console.log('📦 Copiando Chromium para o pacote...');
    console.log('   de :', srcDir);
    console.log('   para:', destChromeDir);

    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destChromeDir, { recursive: true });

    console.log('✅ Chromium copiado para .chromium-cache.');
}

main();
