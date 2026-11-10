#!/usr/bin/env bash
# Подключает домен к сайту через nginx на сервере (порты 80/443) и выпускает HTTPS-сертификат Let's Encrypt.
set -uo pipefail
DOMAIN="$1"; PORT="$2"
echo "-> домен: $DOMAIN -> 127.0.0.1:$PORT"
if ! command -v nginx >/dev/null 2>&1; then
  if ss -ltn | awk '{print $4}' | grep -qE '[:.]80$'; then
    echo "-> ВНИМАНИЕ: порт 80 занят не nginx — домен не подключён"; ss -ltnp | grep -E '[:.]80 ' | head -3; exit 0
  fi
  echo "-> ставлю nginx"
  DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx >/dev/null
fi
CONF=/etc/nginx/conf.d/kront.conf
if [ ! -f "$CONF" ] || ! grep -q "127.0.0.1:$PORT" "$CONF"; then
  cat > "$CONF" <<NG
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NG
fi
nginx -t 2>&1 | tail -2 && systemctl reload nginx
if ! grep -q "listen 443" "$CONF"; then
  command -v certbot >/dev/null 2>&1 || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx >/dev/null; }
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>&1 | tail -3 \
    || echo "-> HTTPS пока не выпущен — сайт работает по http"
fi
