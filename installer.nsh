; installer.nsh
; Configuração automática de permissões de rede para o Chromium
; Este script é executado pelo instalador NSIS com privilégios de Administrador.
; Encontra o chrome.exe empacotado e cria regras no Windows Firewall, evitando
; o bloqueio de rede na primeira execução em máquinas corporativas ou com
; políticas restritivas.

!macro customInstall
  DetailPrint "Configurando permissões de rede para o Chromium..."

  ; Gera um script PowerShell temporário.
  ; Usa [char]34 para obter aspas duplas sem conflito com as aspas do NSIS.
  FileOpen $0 "$TEMP\bot_setup_firewall.ps1" w
  FileWrite $0 "$$d='$INSTDIR'$\r$\n"
  FileWrite $0 "$$r='Bot Envio WhatsApp - Chromium'$\r$\n"
  FileWrite $0 "$$cs=Get-ChildItem -Path $$d -Recurse -Filter 'chrome.exe' -ErrorAction SilentlyContinue$\r$\n"
  FileWrite $0 "if(-not $$cs){Write-Host 'Aviso: chrome.exe nao encontrado, ignorando configuracao de firewall';exit 0}$\r$\n"
  FileWrite $0 "foreach($$c in $$cs){$\r$\n"
  FileWrite $0 "    $$p=$$c.FullName$\r$\n"
  FileWrite $0 "    $$q=[char]34$\r$\n"
  FileWrite $0 "    cmd /c ('netsh advfirewall firewall delete rule name='+$$q+$$r+$$q+' program='+$$q+$$p+$$q) 2>&1 | Out-Null$\r$\n"
  FileWrite $0 "    cmd /c ('netsh advfirewall firewall add rule name='+$$q+$$r+$$q+' dir=out action=allow program='+$$q+$$p+$$q+' enable=yes profile=any')$\r$\n"
  FileWrite $0 "    cmd /c ('netsh advfirewall firewall add rule name='+$$q+$$r+$$q+' dir=in  action=allow program='+$$q+$$p+$$q+' enable=yes profile=any')$\r$\n"
  FileWrite $0 "    Write-Host ('Regra de rede configurada: '+$$p)$\r$\n"
  FileWrite $0 "}$\r$\n"
  FileWrite $0 "Write-Host 'Configuracao de rede concluida!'$\r$\n"
  FileClose $0

  nsExec::ExecToLog "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $\"$TEMP\bot_setup_firewall.ps1$\""
  Delete "$TEMP\bot_setup_firewall.ps1"
  DetailPrint "Permissoes de rede configuradas com sucesso!"
!macroend

!macro customUnInstall
  DetailPrint "Removendo regras de firewall do Bot Envio WhatsApp..."
  nsExec::ExecToLog "netsh advfirewall firewall delete rule name=$\"Bot Envio WhatsApp - Chromium$\""
  DetailPrint "Regras de firewall removidas."
!macroend
