#!/usr/bin/env bash
# Один раз: ставит автообновление Kront (systemd-таймер, проверка GitHub раз в минуту) и сразу делает деплой.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$DIR/deploy.sh" "$DIR/scripts/autodeploy.sh"
cat > /etc/systemd/system/kront-autodeploy.service <<UNIT
[Unit]
Description=Kront: обновление из GitHub
After=network-online.target docker.service

[Service]
Type=oneshot
WorkingDirectory=$DIR
ExecStart=/usr/bin/env bash $DIR/scripts/autodeploy.sh
TimeoutStartSec=1800
UNIT
cat > /etc/systemd/system/kront-autodeploy.timer <<UNIT
[Unit]
Description=Kront: проверять GitHub раз в минуту

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
Unit=kront-autodeploy.service

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now kront-autodeploy.timer
echo "Автообновление включено: $(systemctl is-active kront-autodeploy.timer)"
cd "$DIR" && bash ./deploy.sh
