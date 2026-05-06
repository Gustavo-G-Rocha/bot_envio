# 🎨 Como Adicionar Logo ao Instalador

## ⚠️ Problema Encontrado

O erro que você viu:
```
Error while loading icon from "logo.png": invalid icon file
```

**Causa:** O instalador NSIS (Windows) **não aceita PNG**, apenas arquivos **.ICO**

## ✅ Solução Simples (Recomendada)

### Opção 1: Converter Online (Mais Fácil)

1. **Acesse:** https://convertio.co/pt/png-ico/
2. **Faça upload** do arquivo `logo.png`
3. **Baixe** o arquivo convertido `logo.ico`
4. **Salve** na pasta raiz do projeto (junto com o logo.png)
5. **Execute** novamente o `gerar-executavel.bat`

### Opção 2: Usar Script Automático

Execute:
```
converter-logo-ico.bat
```

Este script tentará converter automaticamente. Se não funcionar, use a Opção 1.

## 📝 Depois de Ter o logo.ico

Atualize o arquivo `electron-builder.json`, adicionando estas linhas na seção `"win"`:

```json
"win": {
  "target": [...],
  "icon": "logo.ico"
},
```

E na seção `"nsis"`:

```json
"nsis": {
  ...,
  "installerIcon": "logo.ico",
  "uninstallerIcon": "logo.ico"
}
```

## 🚀 Status Atual

### ✅ O que já funciona:
- Logo na **janela do aplicativo** (logo.png funciona!)
- Todas as correções de abertura de janela
- Logs detalhados

### ⏳ O que precisa de logo.ico:
- Ícone do instalador
- Ícone do desinstalador
- Ícone no Painel de Controle

## 💡 Por Enquanto

Você pode gerar o instalador **sem logo personalizado** (usará o padrão do Electron).

O importante é que:
- ✅ A janela agora abre corretamente
- ✅ O logo aparece na janela do app
- ✅ Todas as melhorias de código estão aplicadas

Para adicionar logo no instalador depois, basta:
1. Converter PNG → ICO
2. Atualizar electron-builder.json
3. Gerar instalador novamente

## 🎯 Próximos Passos

**Opção A:** Gerar instalador agora (sem logo no instalador)
```
Execute: gerar-executavel.bat
```

**Opção B:** Converter logo primeiro, depois gerar
```
1. Converter logo.png → logo.ico (online)
2. Atualizar electron-builder.json
3. Execute: gerar-executavel.bat
```

---

**Recomendação:** Gere o instalador primeiro para testar as correções da janela. Depois adicione o logo quando tiver tempo! 😊
