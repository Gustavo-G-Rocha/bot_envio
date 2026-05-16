/**
 * Configuração do Puppeteer (v21+).
 *
 * Força o download do Chromium para a pasta LOCAL do projeto (.chromium-cache)
 * em vez do diretório global do usuário (~/.cache/puppeteer).
 *
 * Isso garante que o electron-builder encontre e empacote o Chromium
 * automaticamente no instalador final — sem intervenção manual.
 */
module.exports = {
  cacheDirectory: './.chromium-cache',
};
