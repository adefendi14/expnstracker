#!/usr/bin/env bash
# Run ON the Hostinger VPS after the project is copied/cloned.
# Defaults to ports that do not collide with arteco on 80/443.
# Usage:
#   export SITE_ADDRESS=your.domain   # optional; default :443 (TLS on mapped HTTPS_PORT)
#   export ACME_EMAIL=you@example.com # optional; for Let's Encrypt with a domain
#   export HTTP_PORT=8088 HTTPS_PORT=8443
#   ./deploy/deploy-hostinger.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker non trovato. Installa Docker Engine e riprova." >&2
  exit 1
fi

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a
  # Prefer committed defaults; .env overrides.
  . ./.env
  set +a
fi

pick_free_port() {
  local start="$1"
  local p="$start"
  while ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${p}$" || \
        netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${p}$"; do
    p=$((p + 1))
    if [ "$p" -gt $((start + 200)) ]; then
      echo "Nessuna porta libera vicino a ${start}" >&2
      exit 1
    fi
  done
  echo "$p"
}

# Prefer dedicated high ports so arteco can keep 80/443.
HTTP_CANDIDATE="${HTTP_PORT:-8088}"
# Prefer 3443: on shared VPS 8443 is often already taken (e.g. studioquattrini).
HTTPS_CANDIDATE="${HTTPS_PORT:-3443}"

if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${HTTP_CANDIDATE}$" || \
   netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${HTTP_CANDIDATE}$"; then
  HTTP_PORT="$(pick_free_port "$HTTP_CANDIDATE")"
else
  HTTP_PORT="$HTTP_CANDIDATE"
fi

if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${HTTPS_CANDIDATE}$" || \
   netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${HTTPS_CANDIDATE}$"; then
  HTTPS_PORT="$(pick_free_port "$HTTPS_CANDIDATE")"
else
  HTTPS_PORT="$HTTPS_CANDIDATE"
fi

export HTTP_PORT HTTPS_PORT
export SITE_ADDRESS="${SITE_ADDRESS:-:443}"
export ACME_EMAIL="${ACME_EMAIL:-}"

echo "HTTP_PORT=${HTTP_PORT} HTTPS_PORT=${HTTPS_PORT} SITE_ADDRESS=${SITE_ADDRESS}"

docker compose up -d --build

PUBLIC_IP="$(curl -4 -fsS ifconfig.me 2>/dev/null || curl -4 -fsS icanhazip.com 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "ExpnsTracker (HTTPS) è su:"
if [ "$HTTPS_PORT" = "443" ]; then
  echo "  https://${PUBLIC_IP}/"
  if [ "$SITE_ADDRESS" != ":443" ] && [ "$SITE_ADDRESS" != ":80" ]; then
    echo "  https://${SITE_ADDRESS}/"
  fi
else
  echo "  https://${PUBLIC_IP}:${HTTPS_PORT}/"
  if [ "$SITE_ADDRESS" != ":443" ] && [ "$SITE_ADDRESS" != ":80" ]; then
    echo "  https://${SITE_ADDRESS}:${HTTPS_PORT}/  (se il DNS punta a questa VPS)"
  fi
fi
echo "HTTP (redirect/ACME): host port ${HTTP_PORT}"
echo
echo "Apri la porta ${HTTPS_PORT}/tcp (e ${HTTP_PORT}/tcp) nel firewall Hostinger se non risponde."
