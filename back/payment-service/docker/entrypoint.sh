#!/bin/sh
set -eu

echo "[auth-service] waiting for database..."
node ./scripts/wait-for-db.js

echo "[auth-service] generating prisma client..."
npx prisma generate --schema prisma/schema.prisma

if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null || true)" != "" ]; then
  echo "[auth-service] applying prisma migrations (migrate deploy)..."
  npx prisma migrate deploy --schema prisma/schema.prisma
else
  echo "[auth-service] no prisma migrations found; syncing schema with db push..."
  npx prisma db push --schema prisma/schema.prisma
fi

if [ "${PRISMA_SEED:-false}" = "true" ]; then
  echo "[auth-service] seeding database..."
  npx prisma db seed --schema prisma/schema.prisma
fi

echo "[auth-service] starting: $*"
exec "$@"

