# 🔧 Solução de Problemas - App Não Abre

## ❌ Problema: Janela não aparece após instalação

Se após instalar o app ele aparece no Gerenciador de Tarefas mas a janela não abre, siga estes passos:

### ✅ Solução 1: Finalizar Processos e Reabrir

1. Abra o **Gerenciador de Tarefas** (Ctrl + Shift + Esc)
2. Procure por **"Bot Envio WhatsApp"** ou **"electron"**
3. Clique com o botão direito → **Finalizar tarefa**
4. Feche todos os processos relacionados
5. Abra o app novamente pelo atalho

### ✅ Solução 2: Verificar Porta em Uso

O app usa a porta 1414. Outro programa pode estar usando esta porta:

1. Abra o PowerShell como Administrador
2. Execute:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 1414).OwningProcess
```
3. Se aparecer algum processo, finalize-o
4. Tente abrir o app novamente

### ✅ Solução 3: Reinstalar o App

1. Desinstale pelo **Painel de Controle → Programas**
2. Baixe o instalador novamente
3. Instale em um local diferente (ex: C:\BotWhatsApp)
4. Execute como Administrador na primeira vez

### ✅ Solução 4: Verificar Firewall/Antivírus

O firewall ou antivírus pode estar bloqueando:

1. Abra **Windows Defender** (ou seu antivírus)
2. Adicione **Bot Envio WhatsApp** nas exceções
3. Permita comunicação na porta 1414
4. Tente abrir novamente

### ✅ Solução 5: Executar como Administrador

1. Clique com botão direito no atalho do app
2. Selecione **"Executar como administrador"**
3. Permita as alterações

### ✅ Solução 6: Verificar Logs (Avançado)

Se você é desenvolvedor ou tem conhecimento técnico:

1. Execute o app
2. Abra o **Visualizador de Eventos** do Windows
3. Vá em **Logs do Windows → Aplicativo**
4. Procure por erros relacionados ao "Bot Envio WhatsApp" ou "Electron"

### 🐛 O que foi corrigido na última versão:

- ✅ Adicionado tratamento melhorado de erros
- ✅ Janela só aparece quando estiver completamente carregada
- ✅ Logs detalhados para diagnóstico
- ✅ Tentativas automáticas de reconexão ao servidor
- ✅ Diálogo de erro se o servidor não iniciar

### 📞 Ainda não funciona?

Se nenhuma solução acima funcionou:

1. Desinstale completamente o app
2. Certifique-se que não há processos restantes no Gerenciador de Tarefas
3. Reinicie o computador
4. Instale novamente
5. Execute como Administrador

### 💡 Dica para Desenvolvedores

Para gerar uma nova versão com mais logs, edite `electron-main.js` e adicione:

```javascript
mainWindow.webContents.openDevTools(); // Após createWindow
```

Isso abrirá o console de desenvolvedor para ver erros em tempo real.

---

## ✅ Versão Atualizada

A versão mais recente do código já inclui:
- Melhor tratamento de erros
- Mensagens de erro visuais
- Logs detalhados no console
- Tentativas automáticas de reconexão

**Gere um novo instalador** para ter essas melhorias!
