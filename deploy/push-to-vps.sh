#!/usr/bin/env bash
# Run from a machine that already has SSH to the Hostinger VPS (e.g. Andrea's Mac).
# Builds the static PWA and publishes it to the nginx root that serves :3003.
#
# Required:
#   VPS_HOST=187.126.18.71
#   VPS_USER=ubuntu          # or root / your Hostinger user
# Optional:
#   VPS_SSH_KEY=~/.ssh/id_ed25519
#   VPS_WEBROOT=/var/www/expnstracker   # directory nginx serves on :3003
#   ENABLE_HTTPS=1                      # also start Caddy TLS on :3443
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VPS_HOST="${VPS_HOST:-187.126.18.71}"
VPS_USER="${VPS_USER:-ubuntu}"
VPS_WEBROOT="${VPS_WEBROOT:-/var/www/expnstracker}"
ENABLE_HTTPS="${ENABLE_HTTPS:-1}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "${VPS_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$VPS_SSH_KEY")
fi

REMOTE="${VPS_USER}@${VPS_HOST}"
ssh_cmd() { ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"; }
rsync_cmd() { rsync -az --delete -e "ssh ${SSH_OPTS[*]}" "$@"; }

echo "→ Build static export (root basePath)…"
unset GITHUB_PAGES PAGES_BASE_PATH || true
npm ci
npm run build
test -f out/index.html

echo "→ Ensure remote web root ${VPS_WEBROOT}"
ssh_cmd "sudo mkdir -p '${VPS_WEBROOT}' && sudo chown -R \$(whoami):\$(whoami) '${VPS_WEBROOT}' || mkdir -p '${VPS_WEBROOT}'"

echo "→ Rsync out/ → ${REMOTE}:${VPS_WEBROOT}/"
rsync_cmd out/ "${REMOTE}:${VPS_WEBROOT}/"

echo "→ Reload nginx (best effort)"
ssh_cmd "sudo nginx -t && sudo systemctl reload nginx || sudo service nginx reload || true"

if [ "$ENABLE_HTTPS" = "1" ]; then
  echo "→ HTTPS proxy on :3443"
  rsync_cmd deploy/Caddyfile.https-proxy deploy/docker-compose.https-proxy.yml deploy/enable-https-proxy.sh \
    "${REMOTE}:/tmp/expnstracker-https/"
  ssh_cmd "mkdir -p ~/expnstracker-https && cp -f /tmp/expnstracker-https/* ~/expnstracker-https/ && \
    cd ~/expnstracker-https && HTTPS_PORT=3443 UPSTREAM=host.docker.internal:3003 \
    docker compose -f docker-compose.https-proxy.yml up -d"
fi

echo
echo "HTTP:  http://${VPS_HOST}:3003/"
echo "HTTPS: https://${VPS_HOST}:3443/  (se ENABLE_HTTPS=1 e porta aperta)"
