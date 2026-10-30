#!/bin/sh
set -eu

access_log_arg=--no-access-log
if [ "${APP_ENV:-development}" != "production" ] || [ "${ACCESS_LOG:-false}" = "true" ]; then
    access_log_arg=--access-log
fi

exec uvicorn fengchao:create_app --factory \
    --host "${HOST:-0.0.0.0}" \
    --port "${PORT:-12345}" \
    --workers "${WORKERS:-1}" \
    --log-level "${LOG_LEVEL:-warning}" \
    "$access_log_arg" \
    --timeout-keep-alive "${TIMEOUT_KEEP_ALIVE:-5}" \
    --proxy-headers \
    --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-}"
