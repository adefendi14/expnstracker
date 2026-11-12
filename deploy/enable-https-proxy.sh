#!/usr/bin/env bash
# Run ON the VPS where ExpnsTracker already answers on HTTP :3003.
# Puts Caddy TLS on host port 3443 (8443 is often taken by other sites).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Serve Docker sulla VPS." >&2
  exit 1
fi

export HTTPS_PORT="${HTTPS_PORT:-3443}"
export SITE_ADDRESS="${SITE_ADDRESS:-:443}"
export ACME_EMAIL="${ACME_EMAIL:-}"
export UPSTREAM="${UPSTREAM:-host.docker.internal:3003}"

echo "Avvio TLS su host :${HTTPS_PORT} → ${UPSTREAM}"
docker compose -f deploy/docker-compose.https-proxy.yml up -d

PUBLIC_IP="$(curl -4 -fsS ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "HTTPS pronto (certificato locale se non c’è un dominio LE):"
echo "  https://${PUBLIC_IP}:${HTTPS_PORT}/"
echo "HTTP resta su http://${PUBLIC_IP}:3003/"
echo "Apri la porta ${HTTPS_PORT}/tcp nel firewall Hostinger se non risponde dall’esterno."
