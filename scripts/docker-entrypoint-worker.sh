#!/bin/sh
set -e

echo "[entrypoint:worker] Aguardando schema do banco..."

attempt=1
max_attempts=15

while [ "$attempt" -le "$max_attempts" ]; do
  if npx prisma db push --skip-generate; then
    echo "[entrypoint:worker] Schema sincronizado."
    break
  fi

  echo "[entrypoint:worker] Tentativa ${attempt}/${max_attempts} falhou. Aguardando MySQL..."
  attempt=$((attempt + 1))
  sleep 3
done

if [ "$attempt" -gt "$max_attempts" ]; then
  echo "[entrypoint:worker] Não foi possível sincronizar o banco após ${max_attempts} tentativas."
  exit 1
fi

echo "[entrypoint:worker] Iniciando worker..."
exec npm run worker
