#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
for file in logs/frontend.pid logs/backend.pid; do
  if [ -f "$file" ]; then kill "$(cat "$file")" 2>/dev/null || true; rm -f "$file"; fi
done
docker compose down
echo '服务已停止（数据卷保留）。'
