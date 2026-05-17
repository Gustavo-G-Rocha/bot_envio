// ============================================================
// Bot Envio WhatsApp — Sistema de Licenças
// Cole este código no Google Apps Script e publique como Web App
// Instruções no final deste arquivo
// ============================================================

const SPREADSHEET_ID = '1BMM36O0P9VKi_Jm2RLFC4jxccG0LhYh-zYzUvi1l1XQ';
const SHEET_NAME = 'Licencas';

// Token embutido no executável (permite apenas validar chaves)
const VALIDATION_TOKEN = 'Missioneiro_14@2026';

// Token só seu (permite gerar novas chaves via gerar-chaves.js)
// NUNCA coloque este token dentro do executável!
const ADMIN_TOKEN = '#Gustavo_Rocha_Missao_14*';

// ─────────────────────────────────────────────────────────────────────────────

// ─── Menu da planilha ─────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔑 Gerenciar Licenças')
    .addItem('Desativar chave (libera dispositivo)', 'desativarChave')
    .addItem('Revogar chave (bloqueia permanentemente)', 'revogarChave')
    .addToUi();
}

/**
 * Desativa a chave da linha selecionada:
 * - STATUS volta para DISPONIVEL
 * - Limpa DEVICE_ID, DATA_ATIVACAO e OBSERVACAO (colunas C, D, E)
 * Isso permite que a chave seja usada em outro dispositivo.
 */
function desativarChave() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveCell().getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ Selecione uma linha de dados (não o cabeçalho).');
    return;
  }

  const key = sheet.getRange(row, 1).getValue();
  if (!key) {
    SpreadsheetApp.getUi().alert('⚠️ Linha vazia. Selecione uma linha com uma chave.');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Desativar chave',
    `Desativar a chave:\n"${key}"\n\nO dispositivo vinculado será liberado e a chave poderá ser ativada em outro dispositivo.`,
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  sheet.getRange(row, 2).setValue('DISPONIVEL');      // STATUS
  sheet.getRange(row, 3, 1, 3).clearContent();         // DEVICE_ID, DATA_ATIVACAO, OBSERVACAO

  ui.alert(`✓ Chave "${key}" desativada com sucesso.\nPode ser usada em outro dispositivo.`);
}

/**
 * Revoga a chave da linha selecionada:
 * - STATUS muda para REVOGADA
 * - O usuário perde acesso na próxima abertura do app.
 */
function revogarChave() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveCell().getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ Selecione uma linha de dados (não o cabeçalho).');
    return;
  }

  const key = sheet.getRange(row, 1).getValue();
  if (!key) {
    SpreadsheetApp.getUi().alert('⚠️ Linha vazia. Selecione uma linha com uma chave.');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Revogar chave',
    `Revogar permanentemente a chave:\n"${key}"\n\nO usuário perderá acesso na próxima abertura do app.\nEssa ação NÃO pode ser desfeita (a não ser manualmente).`,
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  sheet.getRange(row, 2).setValue('REVOGADA');         // STATUS

  ui.alert(`✓ Chave "${key}" revogada.\nO usuário perderá acesso imediatamente.`);
}

// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { action, token } = data;

    if (action === 'validate') {
      if (token !== VALIDATION_TOKEN) {
        return jsonResponse({ valid: false, message: 'Token inválido.' });
      }
      return jsonResponse(validateKey(data.key, data.deviceId));
    }

    if (action === 'generate') {
      if (token !== ADMIN_TOKEN) {
        return jsonResponse({ success: false, message: 'Token admin inválido.' });
      }
      return jsonResponse(generateKeys(parseInt(data.quantidade) || 1));
    }

    return jsonResponse({ error: 'Ação desconhecida.' });

  } catch (err) {
    return jsonResponse({ error: 'Erro interno: ' + err.message });
  }
}

// ─── Validação de chave ───────────────────────────────────────────────────────

function validateKey(key, deviceId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      const status     = String(rows[i][1] || '').trim();
      const savedDevice = String(rows[i][2] || '').trim();

      if (status === 'REVOGADA') {
        return { valid: false, message: 'Licença revogada. Entre em contato com o suporte.' };
      }
      if (status === 'ATIVADA') {
        if (savedDevice !== deviceId) {
          return { valid: false, message: 'Esta chave já está em uso em outro dispositivo.' };
        }
        return { valid: true };
      }
      if (status === 'DISPONIVEL') {
        const now = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
        sheet.getRange(i + 1, 2, 1, 3).setValues([['ATIVADA', deviceId, now]]);
        return { valid: true };
      }

      return { valid: false, message: 'Status de licença inválido.' };
    }
  }

  return { valid: false, message: 'Chave inválida.' };
}

// ─── Geração de chaves ────────────────────────────────────────────────────────

function generateKeys(quantidade) {
  if (quantidade < 1 || quantidade > 500) {
    return { success: false, message: 'Quantidade deve ser entre 1 e 500.' };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

  // Cria cabeçalho se a planilha estiver vazia
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['CHAVE', 'STATUS', 'DEVICE_ID', 'DATA_ATIVACAO', 'OBSERVACAO']);
  }

  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I/L
  const rows = [];
  const keys = [];

  for (let k = 0; k < quantidade; k++) {
    let key = '';
    for (let g = 0; g < 4; g++) {
      if (g > 0) key += '-';
      for (let i = 0; i < 5; i++) {
        key += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
    }
    rows.push([key, 'DISPONIVEL', '', '', '']);
    keys.push(key);
  }

  // Inserção em lote (1 chamada à API em vez de N) — muito mais rápido
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 5).setValues(rows);

  return { success: true, keys };
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// INSTRUÇÕES DE DEPLOY:
//
// 1. Acesse: script.google.com
// 2. Clique em "Novo projeto"
// 3. Apague o código padrão e cole TODO este arquivo
// 4. Substitua os tokens pelos seus valores secretos
// 5. Clique em "Implantar" → "Nova implantação"
// 6. Tipo: "App da Web"
// 7. Executar como: "Eu (seu e-mail)"
// 8. Quem pode acessar: "Qualquer pessoa"
// 9. Clique em "Implantar" → copie a URL gerada
// 10. Cole a URL em src/license.js (WEB_APP_URL)
//     e em gerar-chaves.js (WEB_APP_URL)
// ============================================================
