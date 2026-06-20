#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${1:-}"
REMOTE_PATH="${2:-/var/www/sagi}"
SERVICE_NAME="${3:-sagi}"

if [[ -z "$REMOTE_HOST" ]]; then
  echo "Usage: ./scripts/release.sh user@host [/remote/path] [systemd-service]"
  exit 1
fi

echo "Releasing to ${REMOTE_HOST}:${REMOTE_PATH}"

rsync \
  --archive \
  --compress \
  --delete \
  --exclude ".git" \
  --exclude ".env" \
  --exclude "node_modules" \
  --exclude "apps/*/dist" \
  --exclude "packages/*/dist" \
  --exclude "*.tsbuildinfo" \
  ./ "${REMOTE_HOST}:${REMOTE_PATH}"

ssh "$REMOTE_HOST" "
  set -euo pipefail
  cd '$REMOTE_PATH'
  set -a
  [ -f ./.env ] && . ./.env
  set +a
  npm ci
  npm run build
  sudo systemctl restart '$SERVICE_NAME'
  sudo systemctl status '$SERVICE_NAME' --no-pager
"
