#!/usr/bin/env bash
#
# 66 Vizite - Docker tabanli PHP sunucu baslatici (tek dosya)
#
# Docker'i projeye entegre etmez; hicbir Dockerfile / compose dosyasi olusturmaz.
# Her sey bu script icinde tanimlidir. Sunucu ayri bir konteynerde, arkada calisir.
#
# Kullanim:
#   ./baslat.sh              Sunucuyu baslatir (zaten aciksa eskisini kapatir)
#   ./baslat.sh dur          Sunucuyu kapatir
#   ./baslat.sh durum        Sunucunun durumunu gosterir
#   ./baslat.sh log          Sunucu loglarini canli izler (Ctrl+C ile cik)
#
# Port: 8000 (degistirmek icin: PORT=9000 ./baslat.sh)

set -euo pipefail

PORT="${PORT:-8000}"
CONTAINER_PORT="8000"
NAME="66vizite-web"
IMAGE="php:8.3-cli-alpine"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info() { printf '%s\n' "$*"; }
err()  { printf '%s\n' "$*" >&2; }

need_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        err "[HATA] Docker bulunamadi! Kurulum: https://docs.docker.com/get-docker/"
        exit 1
    fi
    if ! docker info >/dev/null 2>&1; then
        err "[HATA] Docker'a erisilemiyor. Docker acik mi, izniniz var mi? (sudo gerekiyorsa grubunuzu kontrol edin)"
        exit 1
    fi
}

container_running() {
    [ "$(docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null || echo false)" = "true" ]
}

stop_server() {
    local found=0 cid cname

    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$NAME"; then
        info "[1/3] Eski sunucu konteyneri kapatiliyor: $NAME"
        docker rm -f "$NAME" >/dev/null
        found=1
    else
        info "[1/3] Bu script'e ait acik sunucu yok."
    fi

    for cid in $(docker ps -q --filter "publish=$PORT" 2>/dev/null); do
        cname="$(docker inspect -f '{{.Name}}' "$cid" | sed 's#^/##')"
        info "[2/3] Portu $PORT kullanan konteyner kapatiliyor: $cname"
        docker rm -f "$cid" >/dev/null
        found=1
    done

    if [ "$found" -eq 1 ]; then
        info "[3/3] Sunucu kapatildi."
    else
        info "[3/3] Kapatilacak konteyner bulunamadi."
    fi
}

start_server() {
    stop_server

    info "--------------------------------------------------"
    if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
        info "[BILGI] Docker imaji ilk kez indiriliyor: $IMAGE"
        info "[BILGI] Bu islem bir kereye mahsus, biraz zaman alabilir."
    fi

    info "[1/3] Konteyner baslatiliyor (arka planda)..."
    LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
    if [ -z "$LAN_IP" ] && command -v ip >/dev/null 2>&1; then
        LAN_IP="$(ip -o -4 addr show scope global 2>/dev/null | awk '{print $4}' | head -n1 | cut -d/ -f1 || true)"
    fi
    if ! docker run -d \
        --name "$NAME" \
        -p "${PORT}:${CONTAINER_PORT}" \
        --user "$(id -u):$(id -g)" \
        -e LAN_IP="${LAN_IP}" \
        -v "${PROJECT_DIR}:/app" \
        -w /app \
        "$IMAGE" \
        sh -c "php -m | grep -q pdo_sqlite || { echo '[HATA] pdo_sqlite eklentisi imajda yok'; exit 1; }; exec php -S 0.0.0.0:${CONTAINER_PORT} -t frontend backend/router.php" \
        >/dev/null; then
        err ""
        err "[HATA] Konteyner baslatilamadi! Port $PORT baska bir yazilim tarafindan kullaniliyor olabilir."
        err "Kullanan sureci bulmak icin: ss -ltnp | grep :${PORT}"
        docker rm -f "$NAME" >/dev/null 2>&1 || true
        exit 1
    fi

    info "[2/3] Sunucu hazir olana kadar bekleniyor..."
    for _ in $(seq 1 40); do
        if [ "$(docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null || echo false)" != "true" ]; then
            err ""
            err "[HATA] Sunucu konteyneri beklenmedik sekilde kapanmis. Son loglar:"
            docker logs "$NAME" 2>&1 | tail -20 || true
            docker rm -f "$NAME" >/dev/null 2>&1 || true
            exit 1
        fi
        if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/"; then
            break
        fi
        sleep 0.5
    done

    echo
    echo "=================================================="
    echo "   66 Vizite sunucusu hazir!"
    echo "=================================================="
    echo "   Yerel : http://localhost:${PORT}"
    if [ -n "$LAN_IP" ]; then
        echo "   Ag    : http://${LAN_IP}:${PORT}  (telefon erisimi icin)"
    fi
    echo ""
    echo "   Durdurmak icin : ./baslat.sh dur"
    echo "   Loglar icin    : ./baslat.sh log"
    echo "=================================================="
}

show_status() {
    if container_running; then
        info "[DURUM] Sunucu CALISIYOR (konteyner: $NAME, port: $PORT)"
        info "[DURUM] Adres: http://localhost:${PORT}"
    else
        info "[DURUM] Sunucu KAPALI."
        info "[DURUM] Baslatmak icin: ./baslat.sh"
    fi
}

follow_logs() {
    if ! container_running; then
        err "[HATA] Sunucu calismiyor. Once: ./baslat.sh"
        exit 1
    fi
    docker logs -f "$NAME"
}

ARGS_USAGE="Kullanim: $0 [baslat | dur | durum | log]"

case "${1:-baslat}" in
    baslat|start|restart|yeniden) shift || true; start_server ;;
    dur|stop|kapat)               stop_server ;;
    durum|status)                 show_status ;;
    log|loglar)                   follow_logs ;;
    -h|--help|yardim)             info "$ARGS_USAGE" ;;
    *)                            err "[HATA] Bilinmeyen komut: $1"; err "$ARGS_USAGE"; exit 1 ;;
esac
