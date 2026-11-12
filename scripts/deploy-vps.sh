#!/usr/bin/env bash
# Deploy ExpnsTracker to Hostinger VPS (nginx on :3003).
# Run from a machine with SSH access (Andrea's Mac).
#
# Preferred while GitHub origin/main may be stale — extract Cursor tarball:
#   tar -xzf expnstracker-vps-XXXX.tgz -C /tmp/expnstracker-vps-deploy
#   cd /tmp/expnstracker-vps-deploy
#   DEPLOY_NO_CACHE=1 ./scripts/deploy-vps.sh
#
# Or from a git checkout that already contains the Cursor tip SHA:
#   DEPLOY_SHA=<full-sha> DEPLOY_NO_CACHE=1 ./scripts/deploy-vps.sh
#
# Do NOT `git reset --hard origin/main` unless that remote has the Cursor tip.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VPS_HOST="${VPS_HOST:-187.126.18.71}"
VPS_USER="${VPS_USER:-root}"
VPS_DIR="${VPS_DIR:-/var/www/expnstracker}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "${VPS_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$VPS_SSH_KEY")
fi

REMOTE="${VPS_USER}@${VPS_HOST}"
ssh_cmd() { ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"; }

resolve_deploy_sha() {
  if [ -n "${DEPLOY_SHA:-}" ]; then
    printf '%s\n' "$DEPLOY_SHA"
    return
  fi
  if [ -f DEPLOY_SHA.txt ]; then
    local from_file
    from_file="$(tr -d '[:space:]' < DEPLOY_SHA.txt || true)"
    if [ -n "$from_file" ] && [ "$from_file" != "unknown" ]; then
      printf '%s\n' "$from_file"
      return
    fi
  fi
  if git rev-parse HEAD >/dev/null 2>&1; then
    git rev-parse HEAD
    return
  fi
  echo "ERROR: manca DEPLOY_SHA (env o file DEPLOY_SHA.txt) e non c'è un repo git." >&2
  echo "       Dal tarball Cursor: export DEPLOY_SHA=<sha-del-tarball> oppure usa un tarball che include DEPLOY_SHA.txt." >&2
  exit 1
}

DEPLOY_SHA="$(resolve_deploy_sha)"
export DEPLOY_SHA
printf '%s\n' "$DEPLOY_SHA" > DEPLOY_SHA.txt
echo "==> Deploy SHA ${DEPLOY_SHA}"
echo "==> Tip: email login + HTTP crypto + tab fix (non usare origin/main se è indietro)"

# Guard against accidentally shipping the ancient pre-email build.
if ! grep -q 'Email o password non corretti' src/lib/store.tsx 2>/dev/null; then
  echo "ERROR: src/lib/store.tsx non ha il login email — stai per deployare una versione VECCHIA."
  echo "       Usa l'ultimo tarball Cursor expnstracker-vps-*.tgz (non origin/main stale)."
  exit 1
fi
if ! grep -q 'label="Email"' src/components/auth-screen.tsx 2>/dev/null; then
  echo "ERROR: auth-screen senza campo Email — versione vecchia."
  exit 1
fi

echo "==> Test SSH (${REMOTE})"
ssh_cmd "echo OK"

echo "==> Sync → ${VPS_DIR}"
ssh_cmd "mkdir -p '${VPS_DIR}'"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude out --exclude .git \
  --exclude agent-tools --exclude .preview-root \
  -e "ssh ${SSH_OPTS[*]}" \
  ./ "${REMOTE}:${VPS_DIR}/"

if [ "${DEPLOY_NO_CACHE:-0}" = "1" ]; then
  echo "==> Build & start (porta 3003, NO CACHE)"
  BUILD_CMD="DEPLOY_SHA='${DEPLOY_SHA}' docker compose -f docker-compose.vps.yml build --no-cache --build-arg DEPLOY_SHA='${DEPLOY_SHA}' && DEPLOY_SHA='${DEPLOY_SHA}' docker compose -f docker-compose.vps.yml up -d && docker compose -f docker-compose.vps.yml ps"
else
  echo "==> Build & start (porta 3003)"
  BUILD_CMD="DEPLOY_SHA='${DEPLOY_SHA}' docker compose -f docker-compose.vps.yml build --build-arg DEPLOY_SHA='${DEPLOY_SHA}' && DEPLOY_SHA='${DEPLOY_SHA}' docker compose -f docker-compose.vps.yml up -d && docker compose -f docker-compose.vps.yml ps"
fi

ssh_cmd "cd '${VPS_DIR}' && ${BUILD_CMD}"

echo "==> HTTPS proxy (:3443 → :3003)"
ssh_cmd "cd '${VPS_DIR}' && \
  HTTPS_PORT=3443 UPSTREAM=host.docker.internal:3003 \
  docker compose -f deploy/docker-compose.https-proxy.yml up -d --build && \
  (command -v ufw >/dev/null && ufw allow 3443/tcp || true) && \
  (command -v firewall-cmd >/dev/null && firewall-cmd --add-port=3443/tcp --permanent && firewall-cmd --reload || true)"

echo "==> Verify live SHA"
LIVE_SHA="$(curl -fsS --max-time 12 "http://${VPS_HOST}:3003/DEPLOY_SHA.txt" | tr -d '\r\n' || true)"
echo "live_sha:${LIVE_SHA:-MISSING}"
if [ "${LIVE_SHA}" != "${DEPLOY_SHA}" ]; then
  echo "ERROR: VPS non serve ${DEPLOY_SHA} (letto: ${LIVE_SHA:-vuoto})."
  echo "       Riprova con DEPLOY_NO_CACHE=1 e svuota cache/SW del browser."
  exit 1
fi

PUBLIC_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://${VPS_HOST}:3003/" || true)"
HTTPS_CODE="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 "https://${VPS_HOST}:3443/" || true)"
echo "public_http:${PUBLIC_CODE:-000}"
echo "public_https:${HTTPS_CODE:-000}"
echo "OK deploy ${DEPLOY_SHA}"
echo "HTTP:  http://${VPS_HOST}:3003/"
echo "HTTPS: https://${VPS_HOST}:3443/  ← preferisci questa"
echo
echo "Dopo il deploy: sul telefono/browser svuota dati sito / service worker di :3003 una volta."
