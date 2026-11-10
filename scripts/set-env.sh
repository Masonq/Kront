#!/usr/bin/env bash
# Ввод ключей прямо в терминале сервера (в чат их отправлять не нужно). Enter — пропустить, значение останется прежним.
set -uo pipefail
cd "$(dirname "$0")/.."
touch .env
ask() {
  local name="$1" title="$2" cur
  cur=$(grep -E "^$name=" .env | cut -d= -f2-)
  printf "%s%s: " "$title" "${cur:+ (уже задан, Enter — оставить)}"
  IFS= read -r val
  if [ -n "$val" ]; then sed -i "/^$name=/d" .env; echo "$name=$val" >> .env; fi
}
echo "== Вход через Google =="
ask GOOGLE_CLIENT_ID "Google Client ID"
ask GOOGLE_CLIENT_SECRET "Google Client secret"
echo "== Проверка мастеров (Didit) =="
ask DIDIT_API_KEY "Didit API key"
ask DIDIT_WORKFLOW_ID "Didit workflow ID"
echo "== ИИ: автоперевод чата и разбор объявлений =="
ask AI_API_KEY "AI API key (OpenAI-совместимый)"
ask AI_BASE_URL "AI base URL (Enter = https://api.openai.com/v1)"
ask AI_MODEL "AI model (Enter = gpt-4o-mini)"
echo "== Сборщик мастеров из Telegram =="
ask TG_API_ID "Telegram api_id (my.telegram.org)"
ask TG_API_HASH "Telegram api_hash"
chmod 600 .env
if grep -q '^TG_API_ID=.' .env && grep -q '^TG_API_HASH=.' .env && ! grep -q '^TG_SESSION=.' .env; then
  echo "== Вход в аккаунт Telegram для сборщика (код придёт в Telegram) =="
  set -a; . ./.env; set +a
  S=$(docker compose run --rm -e TG_API_ID -e TG_API_HASH collector python -m app.collector login | tee /dev/tty | grep '^TG_SESSION=' | tail -1)
  [ -n "$S" ] && echo "$S" >> .env
fi
bash ./deploy.sh
echo "Готово: ключи сохранены в /opt/kront/.env, сайт перезапущен."
