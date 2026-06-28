#!/usr/bin/env bash
set -e

if [ -f ".env" ]; then
  set -o allexport
  # shellcheck disable=SC1091
  . ".env"
  set +o allexport
fi

if [ -z "$MONGO_URL" ]; then
  echo "ERROR: MONGO_URL is required"
  exit 1
fi
if [ -z "$DB_NAME" ]; then
  echo "ERROR: DB_NAME is required"
  exit 1
fi

PORT=${PORT:-8000}
RELOAD=${RELOAD:-False}
PYTHON="/app/venv/bin/python"

if [ ! -x "$PYTHON" ]; then
  PYTHON="python3"
fi

cd "$(dirname "$0")"

if [ "$RELOAD" = "True" ] || [ "$RELOAD" = "true" ]; then
  exec "$PYTHON" -m uvicorn server:app --host 0.0.0.0 --port "$PORT" --reload
else
  exec "$PYTHON" -m uvicorn server:app --host 0.0.0.0 --port "$PORT"
fi
