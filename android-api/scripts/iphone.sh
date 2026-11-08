#!/usr/bin/env bash
# Ajuda para rodar o app no iPhone a partir do Linux (Fedora), sem Mac.
#
#   scripts/iphone.sh usb       # faz o iPhone aparecer no USB (usbmuxd de usuário)
#   scripts/iphone.sh install   # instala o .ipa assinado (espera o "Confiar" no iPhone)
#   scripts/iphone.sh start     # sobe o servidor (:3000) e o Metro (:8081)
#   scripts/iphone.sh status    # mostra o que está rodando
#   scripts/iphone.sh all       # usb + install + start
#
# Variáveis opcionais:
#   IPHONE_NET=lan|tailscale    (padrão: lan; tailscale só com um .ipa gerado após a correção do app.config.js)
#   IPA=/caminho/do.ipa         (padrão: ~/Downloads/iphone-build/MenteEquilibrada-signed.ipa)
#
# Por que o usbmuxd de usuário: no kernel do Fedora o driver `ipheth` (tethering
# USB, modo NCM) prende a interface do iPhone e o usbmuxd do sistema perde o
# aparelho com "RX transfer stalled". Pior: nessa falha ele apaga o registro de
# pareamento como "inválido", e o iPhone pede "Confiar" de novo. Aqui soltamos o
# ipheth da interface (sem root, o seu usuário tem acesso ao /dev/bus/usb do
# iPhone) e rodamos um usbmuxd próprio, que guarda o pareamento em
# ~/.local/share/usbmuxd-user. O Impactor (flatpak) foi configurado com
# `flatpak override` para usar esse socket.
#
# Correção definitiva (precisa de root, uma vez só), se não usar o iPhone como
# modem via cabo:  echo "blacklist ipheth" | sudo tee /etc/modprobe.d/no-ipheth.conf
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$HERE")"
REPO_DIR="$(dirname "$APP_DIR")"
STATE="$HOME/.local/share/usbmuxd-user"
RUN="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/usbmuxd-user"
SOCK="$RUN/usbmuxd.sock"
LOGS="$STATE/logs"
IPA="${IPA:-$HOME/Downloads/iphone-build/MenteEquilibrada-signed.ipa}"
export USBMUXD_SOCKET_ADDRESS="UNIX:$SOCK"
mkdir -p "$STATE/lockdown" "$RUN" "$LOGS"

log() { printf '\033[1;34m[iphone]\033[0m %s\n' "$*"; }

apple_dev() { lsusb | awk '$6 ~ /^05ac:12/ {gsub(":","",$4); print "/dev/bus/usb/"$2"/"$4; exit}'; }

detach_ipheth() {
  local dev="$1"
  python3 -I - "$dev" <<'PY'
import fcntl, os, struct, sys, glob
USBDEVFS_IOCTL = (3 << 30) | (16 << 16) | (ord('U') << 8) | 18
USBDEVFS_DISCONNECT = (ord('U') << 8) | 22
fd = os.open(sys.argv[1], os.O_RDWR)
for path in glob.glob('/sys/bus/usb/drivers/ipheth/*:*'):
    ifno = int(open(path + '/bInterfaceNumber').read(), 16)
    try:
        fcntl.ioctl(fd, USBDEVFS_IOCTL, bytearray(struct.pack('iiP', ifno, USBDEVFS_DISCONNECT, 0)), True)
        print(f'ipheth solto da interface {ifno}')
    except OSError as e:
        print(f'ipheth interface {ifno}: {e}')
PY
}

usbmuxd_running() { pgrep -u "$(id -u)" -f "usbmuxd .*-S $SOCK" >/dev/null; }

cmd_usb() {
  local dev
  dev="$(apple_dev)"
  [ -n "$dev" ] || { log "iPhone não está no USB. Conecte o cabo e desbloqueie o iPhone."; return 1; }
  [ -f "$STATE/lockdown/SystemConfiguration.plist" ] || cp /var/lib/lockdown/SystemConfiguration.plist "$STATE/lockdown/" 2>/dev/null || true
  detach_ipheth "$dev" || true
  if usbmuxd_running && [ -n "$(idevice_id -l 2>/dev/null)" ]; then
    log "usbmuxd de usuário já está rodando."
  else
    pkill -u "$(id -u)" -f "usbmuxd .*-S $SOCK" 2>/dev/null || true
    sleep 1
    # Reset USB: tira o lado usbmux do iPhone de uma sessão travada (o iPhone
    # para de responder ao pacote inicial depois de um "RX transfer stalled").
    python3 -I -c 'import fcntl,os,sys; fd=os.open(sys.argv[1],os.O_WRONLY); fcntl.ioctl(fd,(ord("U")<<8)|20,0); os.close(fd)' "$dev" || true
    sleep 2
    detach_ipheth "$dev" >/dev/null 2>&1 || true
    # O usbmuxd apaga o pareamento quando a conexão trava ("pair record invalid").
    # Guardamos uma cópia e, havendo pareamento, desligamos o preflight (-p).
    mkdir -p "$STATE/pair-backup"
    cp -n "$STATE"/pair-backup/*-*.plist "$STATE/lockdown/" 2>/dev/null || true
    local pre=""
    ls "$STATE"/lockdown/*-*.plist >/dev/null 2>&1 && pre="-p"
    # -n: sem hotplug; ao religar o cabo, rode `scripts/iphone.sh usb` de novo.
    setsid nohup usbmuxd -f -v -n $pre -S "$SOCK" -C "$STATE/lockdown" -P NONE \
      >>"$LOGS/usbmuxd.log" 2>&1 </dev/null &
    for _ in $(seq 1 15); do [ -n "$(idevice_id -l 2>/dev/null)" ] && break; sleep 1; done
  fi
  local udid
  udid="$(idevice_id -l 2>/dev/null | head -1)"
  [ -n "$udid" ] || { log "usbmuxd não viu o iPhone. Veja $LOGS/usbmuxd.log"; return 1; }
  log "iPhone no USB: $udid"
  if idevicepair -u "$udid" validate >/dev/null 2>&1; then
    log "Pareado com este computador."
  else
    log "Ainda NÃO pareado: desbloqueie o iPhone e toque em \"Confiar\" (pede o código do iPhone)."
  fi
}

wait_paired() {
  local udid="$1" n=0
  until idevicepair -u "$udid" validate >/dev/null 2>&1; do
    if (( n % 15 == 0 )); then
      log "Esperando você desbloquear o iPhone e tocar em \"Confiar\"..."
      # Pede o pareamento; com o iPhone bloqueado o pedido fica pendente até desbloquear.
      idevicepair -u "$udid" pair >/dev/null 2>&1 || true
    fi
    # Se o usbmuxd caiu ou o cabo foi religado, refaz.
    if [ -z "$(idevice_id -l 2>/dev/null)" ]; then cmd_usb >/dev/null 2>&1 || true; fi
    n=$((n + 1)); sleep 2
  done
}

cmd_install() {
  cmd_usb
  local udid
  udid="$(idevice_id -l | head -1)"
  wait_paired "$udid"
  log "Pareado. Instalando $(basename "$IPA")..."
  [ -f "$IPA" ] || { log "Não achei $IPA"; return 1; }
  # O plumesign/pymobiledevice3 sempre abrem /run/usbmuxd (ignoram
  # USBMUXD_SOCKET_ADDRESS); o bwrap monta o nosso socket por cima dele.
  local pmd3="$STATE/pmd3/bin/pymobiledevice3"
  [ -x "$pmd3" ] || { python3 -m venv "$STATE/pmd3" && "$STATE/pmd3/bin/pip" install -q pymobiledevice3; }
  local ok=0
  for attempt in 1 2 3 4 5; do
    if ! env -u USBMUXD_SOCKET_ADDRESS bwrap --dev-bind / / --bind "$SOCK" /run/usbmuxd -- \
        "$pmd3" apps install "$IPA" >>"$LOGS/install-detail.log" 2>&1; then
      # No iOS 26, com pouca RAM livre, o jetsam mata o mobile_installation_proxy
      # no meio da instalação. Reiniciar o iPhone resolve.
      log "Tentativa $attempt falhou (o iPhone matou o instalador por falta de memória?). Tentando de novo..."
      sleep 10
    else
      ok=1; break
    fi
  done
  [ "$ok" = 1 ] || { log "Não instalou. Reinicie o iPhone, desbloqueie e rode: scripts/iphone.sh install"; return 1; }
  log "Instalado. No iPhone: Ajustes > Geral > VPN e Gerenciamento de Dispositivo > confie em vitorserpa123@gmail.com"
  log "E ative Ajustes > Privacidade e Segurança > Modo de Desenvolvedor (o iPhone reinicia)."
}

pick_host() {
  local net="${IPHONE_NET:-}"
  local ts lan
  ts="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  lan="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')"
  # Padrão: Wi-Fi. O .ipa atual bloqueia http para 100.x (ver app.config.js).
  [ -z "$net" ] && net=lan
  if [ "$net" = tailscale ] && [ -n "$ts" ]; then echo "$ts"; else echo "$lan"; fi
}

port_up() { ss -ltn "( sport = :$1 )" 2>/dev/null | grep -q LISTEN; }

cmd_start() {
  local host
  host="$(pick_host)"
  log "Endereço do computador para o iPhone: $host"
  if port_up 3000; then
    log "Servidor já está na porta 3000."
  else
    (cd "$REPO_DIR/server" && FIREBASE_PROJECT_ID=androi-api setsid nohup npm start >>"$LOGS/server.log" 2>&1 </dev/null &)
    log "Servidor iniciado (log: $LOGS/server.log)"
  fi
  if port_up 8081; then
    log "Metro já está na porta 8081. Para trocar o endereço: pkill -f 'expo start' e rode de novo."
  else
    # REACT_NATIVE_PACKAGER_HOSTNAME evita o Expo anunciar o IP errado (docker 172.x etc).
    (cd "$APP_DIR" && REACT_NATIVE_PACKAGER_HOSTNAME="$host" EXPO_PUBLIC_API_URL="http://$host:3000" \
      setsid nohup npx expo start --dev-client --port 8081 >>"$LOGS/metro.log" 2>&1 </dev/null &)
    log "Metro iniciado (log: $LOGS/metro.log)"
  fi
  log "No app do iPhone, toque em \"Enter URL manually\" e digite:  http://$host:8081"
}

cmd_status() {
  echo "usbmuxd de usuário: $(usbmuxd_running && echo rodando || echo parado)"
  echo "iPhone: $(idevice_id -l 2>/dev/null | head -1 || true)"
  local u; u="$(idevice_id -l 2>/dev/null | head -1 || true)"
  [ -n "$u" ] && echo "pareado: $(idevicepair -u "$u" validate >/dev/null 2>&1 && echo sim || echo não)"
  echo "servidor :3000: $(port_up 3000 && echo ok || echo parado)"
  echo "metro :8081: $(port_up 8081 && echo ok || echo parado)"
  echo "endereço: http://$(pick_host):8081"
}

case "${1:-all}" in
  usb) cmd_usb ;;
  install) cmd_install ;;
  start) cmd_start ;;
  status) cmd_status ;;
  all) cmd_start; cmd_install ;;
  *) sed -n 2,12p "$0"; exit 1 ;;
esac
