#!/usr/bin/env bash
# Раз в минуту (systemd-таймер): если в GitHub появился новый код — запускает deploy.sh.
# Коммиты, которые меняют только reports/, деплой не запускают.
set -uo pipefail
cd "$(dirname "$0")/.."
exec 9>/tmp/kront-autodeploy.lock
flock -n 9 || exit 0
git fetch -q origin main || exit 0
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] && exit 0
if git diff --quiet "$LOCAL" "$REMOTE" -- . ':(exclude)reports'; then
  git merge -q --ff-only origin/main 2>/dev/null || git reset -q --hard origin/main
  exit 0
fi
git reset -q --hard origin/main
bash ./deploy.sh
