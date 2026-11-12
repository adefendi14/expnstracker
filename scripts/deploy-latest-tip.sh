#!/usr/bin/env bash
# One-shot: extract the Agent Store tip tarball and deploy to VPS (HTTP-only).
# Usage:
#   ./scripts/deploy-latest-tip.sh
#   TIP=d1e5dc1 ./scripts/deploy-latest-tip.sh
#   TIP_TGZ=/path/to/expnstracker-vps-d1e5dc1.tgz ./scripts/deploy-latest-tip.sh
set -euo pipefail

TIP="${TIP:-e42c20e}"

# STOP: do not redeploy superseded tip d1e5dc1 — server Postgres tip is e42c20e (EXP-111).
if [ "${TIP}" = "d1e5dc1" ] && [ "${FORCE_OLD_TIP:-0}" != "1" ]; then
  echo "ERROR: tip d1e5dc1 is superseded by server-db tip e42c20e." >&2
  echo "       Cancel any running d1e5dc1 deploy. Wait for / use TIP=e42c20e." >&2
  echo "       (override only with FORCE_OLD_TIP=1 if you really mean it)" >&2
  exit 2
fi

SSH_KEY="${VPS_SSH_KEY:-$HOME/.ssh/id_ed25519}"

find_tarball() {
  if [ -n "${TIP_TGZ:-}" ] && [ -f "$TIP_TGZ" ]; then
    printf '%s\n' "$TIP_TGZ"
    return 0
  fi

  local candidates=(
    "$HOME/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-1391d4d2-743b-40cf-9936-17d6216747b2/files/internal/expnstracker-vps-${TIP}.tgz"
    "/cursor/stores/bc-1391d4d2-743b-40cf-9936-17d6216747b2/internal/expnstracker-vps-${TIP}.tgz"
  )
  local c
  for c in "${candidates[@]}"; do
    if [ -f "$c" ]; then
      printf '%s\n' "$c"
      return 0
    fi
  done

  # Newest matching tarball under AgentStores
  local found
  found="$(find "$HOME/Library/Application Support/Cursor/AgentStores" \
    -name "expnstracker-vps-${TIP}*.tgz" -type f 2>/dev/null | sort | tail -1 || true)"
  if [ -n "$found" ] && [ -f "$found" ]; then
    printf '%s\n' "$found"
    return 0
  fi
  return 1
}

TGZ="$(find_tarball)" || {
  echo "ERROR: tarball expnstracker-vps-${TIP}*.tgz non trovato." >&2
  echo "       Imposta TIP_TGZ=/path/to/file.tgz oppure TIP=<short-sha>." >&2
  exit 1
}

TMP_BASE="${TMPDIR:-/tmp}"
TMP_BASE="${TMP_BASE%/}"
WORKDIR="${TMP_BASE}/expnstracker-vps-deploy-${TIP}"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
echo "==> Extract: $TGZ"
echo "==> Workdir: $WORKDIR"
tar -xzf "$TGZ" -C "$WORKDIR"
cd "$WORKDIR"

if [ ! -x scripts/deploy-vps.sh ]; then
  echo "ERROR: scripts/deploy-vps.sh mancante nel tarball." >&2
  exit 1
fi

export VPS_SSH_KEY="$SSH_KEY"
export DEPLOY_NO_CACHE="${DEPLOY_NO_CACHE:-1}"
echo "==> Deploy tip ${TIP} (DEPLOY_NO_CACHE=${DEPLOY_NO_CACHE})"
exec ./scripts/deploy-vps.sh
