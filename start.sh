#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

command -v docker >/dev/null || { echo '未找到 Docker'; exit 1; }
docker compose up -d postgres redis
echo '等待 PostgreSQL 和 Redis 就绪...'
for i in $(seq 1 60); do
  if docker compose ps --status running | grep -q postgres && docker compose ps --status running | grep -q redis; then break; fi
  sleep 2
done

if [ ! -d node_modules ]; then npm ci; fi
npx prisma generate --schema server/prisma/schema.prisma
npm run build
npx prisma migrate deploy --schema server/prisma/schema.prisma || echo 'Prisma migrate 未执行成功，请检查已有数据库迁移状态'

mkdir -p logs
if [ -f logs/backend.pid ] && kill -0 "$(cat logs/backend.pid)" 2>/dev/null; then
  echo "后端已运行: $(cat logs/backend.pid)"
else
  nohup npm start > logs/backend.log 2>&1 & echo $! > logs/backend.pid
fi

if [ ! -d client/node_modules ]; then (cd client && npm ci); fi
(cd client && npm run build)
if [ -f logs/frontend.pid ] && kill -0 "$(cat logs/frontend.pid)" 2>/dev/null; then
  echo "前端已运行: $(cat logs/frontend.pid)"
else
  nohup npm --prefix client run preview -- --host 0.0.0.0 --port 5173 > logs/frontend.log 2>&1 & echo $! > logs/frontend.pid
fi
echo '启动完成: http://localhost:5173'
