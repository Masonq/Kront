#!/usr/bin/env bash
# Деплой Kront: ставит Docker при необходимости, собирает и перезапускает контейнеры.
# Отчёт пишется в reports/deploy.log и отправляется в git.
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p reports
LOG=reports/deploy.log
{
  echo "=== deploy $(date -u +%FT%TZ) ==="
  if ! command -v docker >/dev/null 2>&1; then
    echo "-> ставлю Docker"
    curl -fsSL https://get.docker.com | sh
  fi
  [ -f .env ] || { echo "DB_PASSWORD=$(openssl rand -hex 16)" > .env; echo "-> создан .env с паролем БД"; }
  git pull --ff-only
  docker compose up -d --build --remove-orphans
  docker image prune -f >/dev/null
  sleep 8
  echo "-> контейнеры:"; docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}"
  echo "-> проверки:"
  for u in /api/health /sr /ru /sr-cyrl /ru/usluge/vodoinstalacije/vracar /ru/majstor/marko-petrovic /sitemap.xml; do
    printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${WEB_PORT:-8095}$u")" "$u"
  done
  echo "-> последние логи api:"; docker compose logs --tail=15 api 2>&1 | tail -15
} > "$LOG" 2>&1
cat "$LOG" | tail -25
git add "$LOG" && git -c user.name="kront-server" -c user.email="server@kront" commit -qm "deploy report $(date -u +%F_%H%M)" && git push -q || echo "(отчёт не отправлен в git — нет прав на push с сервера)"
