#!/bin/sh
set -e

echo "[ENTRYPOINT] Running database schema synchronization..."
npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss || echo "[ENTRYPOINT WARN] Database sync step failed or DB already up to date."

echo "[ENTRYPOINT] Starting application..."
exec "$@"
