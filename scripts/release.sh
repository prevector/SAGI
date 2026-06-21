#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${1:-}"
REMOTE_PATH="${2:-/var/www/sagi}"
SERVICE_NAME="${3:-sagi}"
REMOTE_OWNER="${4:-}"

if [[ -z "$REMOTE_OWNER" && "$REMOTE_HOST" == root@* ]]; then
  REMOTE_OWNER="deploy:deploy"
fi

if [[ -z "$REMOTE_HOST" ]]; then
  echo "Usage: ./scripts/release.sh user@host [/remote/path] [systemd-service] [remote-owner]"
  exit 1
fi

echo "Releasing to ${REMOTE_HOST}:${REMOTE_PATH}"

RSYNC_ARGS=(
  --archive
  --compress
  --delete
  --exclude ".git"
  --exclude ".env"
  --exclude ".impeccable"
  --exclude "node_modules"
  --exclude "OEEToolbox-master"
  --exclude "apps/*/dist"
  --exclude "packages/*/dist"
  --exclude "*.tsbuildinfo"
)

rsync "${RSYNC_ARGS[@]}" ./ "${REMOTE_HOST}:${REMOTE_PATH}"

ssh "$REMOTE_HOST" "
  set -euo pipefail
  cd '$REMOTE_PATH'
  set -a
  [ -f ./.env ] && . ./.env
  set +a
  npm ci
  npm run build
  if [[ -n '$REMOTE_OWNER' ]]; then
    chown -R '$REMOTE_OWNER' '$REMOTE_PATH'
  fi
  sudo systemctl restart '$SERVICE_NAME'
  sudo systemctl status '$SERVICE_NAME' --no-pager
"
