#!/bin/sh

sync_db () {
  npx prisma db push --skip-generate
}

background_db_sync () {
  while true; do
    sleep 10
    if sync_db; then
      echo "[entrypoint:worker] Schema sincronizado em background."
      break
    fi
    echo "[entrypoint:worker] Ainda aguardando banco para sync..."
  done
}

echo "[entrypoint:worker] Sincronizando schema do banco..."

attempt=1
max_attempts=20

while [ "$attempt" -le "$max_attempts" ]; do
  if sync_db; then
    echo "[entrypoint:worker] Schema sincronizado."
    break
  fi

  echo "[entrypoint:worker] Tentativa ${attempt}/${max_attempts} falhou. Aguardando MySQL..."
  attempt=$((attempt + 1))
  sleep 3
done

if [ "$attempt" -gt "$max_attempts" ]; then
  echo "[entrypoint:worker] AVISO: banco indisponível no boot. Subindo worker e tentando sync em background."
  background_db_sync &
fi

echo "[entrypoint:worker] Iniciando worker..."
exec npm run worker
