# Bot Envio WhatsApp

Bot para envio de mensagens em massa via WhatsApp com interface desktop.

## Instalação

### 1. Instalar dependências

```bash
npm install
```

## Desenvolvimento

### Executar em modo desenvolvedor

```bash
npm run dev
```

Isso abrirá a aplicação em uma janela Electron com Chromium integrado.

## Build / Compilação

### Compilar para Windows

#### Instalador (NSIS) + Versão Portable:
```bash
npm run build-win
```

Isso gera dois executáveis na pasta `dist/`:
- **Bot Envio WhatsApp Setup 1.0.0.exe** - Instalador completo
- **Bot Envio WhatsApp-1.0.0.exe** - Versão portátil (standalone)

#### Apenas versão Portable (recomendado para compartilhar):
```bash
npm run build-portable
```

Gera um único `.exe` que não precisa instalação.

## Como usar

1. Execute o `.exe` (instalador ou portável)
2. A aplicação abrirá automaticamente com Chromium integrado
3. Escaneie o QR Code com seu WhatsApp
4. Comece a usar!

## Recursos

- ✅ Interface moderna e responsiva
- ✅ Envio em massa para grupos
- ✅ Envio em massa para números
- ✅ Suporte para mídia (imagens, vídeos, áudio)
- ✅ Extração de números de grupos
- ✅ Logout e limpeza de autenticação
- ✅ Executável desktop com Chromium integrado

## Requisitos

- Node.js 14+
- Windows 10+
