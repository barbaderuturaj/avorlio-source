#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/seldonframe
CRON_SECRET="$(grep "^CRON_SECRET=" .env.docker | cut -d= -f2-)"

curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/outbound-scheduled-sends >/dev/null
curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/workflow-tick >/dev/null
