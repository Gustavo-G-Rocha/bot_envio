# 🎯 INÍCIO RÁPIDO - Gerar Instalador

## ⚡ Forma Mais Fácil

1. **Execute o arquivo:** `gerar-executavel.bat`
2. **Aguarde** o processo completar (2-10 minutos)
3. **Pegue seu instalador** na pasta `dist/`

## 📦 O que você vai receber:

### Instalador NSIS
```
Bot Envio WhatsApp Setup 1.0.0.exe
```
- Instalador profissional do Windows
- Usuário escolhe onde instalar
- Cria atalhos automaticamente (Desktop + Menu Iniciar)
- Pode desinstalar pelo Painel de Controle
- **Com seu logo personalizado!** 🎨

## 🔒 Seu código está PROTEGIDO!

✅ Empacotado em formato ASAR
✅ Não aparece como arquivos .js visíveis
✅ Compressão máxima aplicada
✅ Usuário recebe apenas o instalador

## ⏱️ Tempo estimado:
- Primeira vez: 5-10 minutos (baixa dependências)
- Próximas vezes: 2-5 minutos

## 📝 Alternativa via Comando:

Se preferir usar o terminal:
```bash
npm run build
```

## 🎨 Personalizar o Logo

O logo.png já está configurado! Se quiser trocar:
1. Substitua o arquivo `logo.png` na raiz do projeto
2. Gere o instalador novamente

**Tamanho recomendado:** 256x256 pixels ou 512x512 pixels

## ❓ Problemas?

### Janela não abre após instalação?
- Verifique se não há firewall bloqueando
- Abra o Gerenciador de Tarefas e finalize qualquer processo "Bot Envio WhatsApp"
- Execute novamente

### Erro com o logo?
Se der erro ao gerar com o logo PNG, converta para .ico:
- Use: https://convertio.co/pt/png-ico/
- Salve como `logo.ico` na raiz do projeto
- Altere `electron-builder.json` para usar `logo.ico`

Veja o arquivo `COMO_GERAR_EXECUTAVEL.md` para mais detalhes.

---

**💡 NOTA:** O instalador agora inclui melhor tratamento de erros e logs para facilitar o diagnóstico.
