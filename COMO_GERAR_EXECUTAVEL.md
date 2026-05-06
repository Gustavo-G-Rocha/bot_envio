# 🚀 Como Gerar o Instalador

## 📋 Pré-requisitos
- Node.js instalado no sistema
- Todas as dependências do projeto instaladas

## 🔧 Passos para Gerar o Instalador

### 1️⃣ Instalar Dependências (se ainda não instalou)
```bash
npm install
```

### 2️⃣ Gerar o Instalador

Você tem **2 opções**:

#### Opção A: Usar o Script Automatizado (Mais Fácil)
Dê duplo clique em:
```
gerar-executavel.bat
```

#### Opção B: Via Comando
```bash
npm run build
```

### 3️⃣ Localizar o Instalador Gerado
Após o build, o instalador estará na pasta:
```
📂 dist/
   ├── 📄 Bot Envio WhatsApp Setup 1.0.0.exe  (Instalador NSIS)
   └── 📂 win-unpacked/                        (Versão descompactada para testes)
```

## 🔒 Proteção do Código-Fonte

Seu código está **PROTEGIDO** da seguinte forma:

✅ **ASAR ativado**: Todo o código JavaScript é empacotado em um arquivo `app.asar`
✅ **Compressão máxima**: Dificulta ainda mais a extração
✅ **Arquivos desnecessários excluídos**: Build otimizado
✅ **Node.js embutido**: O instalador inclui tudo que precisa

### ⚠️ Importante
Embora o código esteja empacotado e protegido, é tecnicamente possível (mas trabalhoso) extrair arquivos ASAR. Para proteção ainda maior, considere:
- Ofuscar código JavaScript crítico antes do build
- Usar soluções comerciais de proteção de código

## 📦 Como Funciona o Instalador NSIS

O instalador gerado oferece:

✅ **Instalação Assistida**: Usuário escolhe onde instalar
✅ **Atalhos Automáticos**: Desktop + Menu Iniciar
✅ **Desinstalação Fácil**: Via Painel de Controle do Windows
✅ **Aparência Profissional**: Interface padrão do Windows
✅ **Limpeza ao Desinstalar**: Remove dados do app ao desinstalar

## 🎯 Distribuição para Usuários

### Como o usuário vai usar:
1. Baixa o arquivo `Bot Envio WhatsApp Setup 1.0.0.exe`
2. Executa o instalador
3. Segue o assistente de instalação
4. Pronto! O app está instalado e atalhos criados

## 🐛 Solução de Problemas

### Erro: "electron-builder not found"
```bash
npm install --save-dev electron-builder
```

### Erro durante o build
1. Limpe a pasta dist:
```bash
rmdir /s /q dist
```
2. Tente novamente o build

### Build muito grande
- É normal! O instalador inclui Node.js e todas as dependências
- Tamanho esperado: 150-300 MB

## 📝 Customizações

### Alterar Nome ou Versão
Edite `package.json`:
```json
{
  "name": "bot_envio",
  "version": "1.0.0"
}
```

### Adicionar Ícone Personalizado
1. Crie ou baixe um arquivo `icon.ico` (256x256 pixels)
2. Salve em: `public/icon.ico`
3. Atualize `electron-builder.json`, adicionando na seção `win`:
```json
"win": {
  "icon": "public/icon.ico",
  ...
}
```
4. Também adicione em `nsis`:
```json
"nsis": {
  "installerIcon": "public/icon.ico",
  "uninstallerIcon": "public/icon.ico",
  ...
}
```

### Configurações Avançadas
Edite `electron-builder.json` para customizar:
- Nome do produto
- Compressão
- Arquivos incluídos/excluídos
- Configurações do instalador

## ✅ Checklist de Distribuição

Antes de distribuir para usuários:

- [ ] Testou o instalador em um computador limpo (sem Node.js instalado)
- [ ] Verificou se o WhatsApp Web funciona corretamente
- [ ] Testou o processo de instalação completo
- [ ] Incluiu documentação de uso (MANUAL_USUARIO.md)
- [ ] Verificou se não há informações sensíveis no código
- [ ] Testou a desinstalação

## 🎉 Pronto!

Agora você pode distribuir o instalador para seus usuários sem expor o código-fonte!
