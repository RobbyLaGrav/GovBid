#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-"$(pwd)/backups"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
POSTGRES_URL=${DATABASE_URL:-"postgresql://localhost:5432/govbid"}
MONGO_URI=${MONGODB_URI:-"mongodb://localhost:27017/govbid"}
REDIS_HOST=${REDIS_HOST:-"localhost"}

mkdir -p "${BACKUP_DIR}"

POSTGRES_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"
MONGO_FILE="${BACKUP_DIR}/mongo_${TIMESTAMP}.archive"
REDIS_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "${POSTGRES_URL}" > "${POSTGRES_FILE}"
  echo "Postgres backup saved to ${POSTGRES_FILE}"
else
  echo "pg_dump not found; skipping Postgres backup" >&2
fi

if command -v mongodump >/dev/null 2>&1; then
  mongodump --uri="${MONGO_URI}" --archive="${MONGO_FILE}" --gzip
  echo "Mongo backup saved to ${MONGO_FILE}"
else
  echo "mongodump not found; skipping MongoDB backup" >&2
fi

if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -h "${REDIS_HOST}" save
  redis-cli -h "${REDIS_HOST}" --rdb "${REDIS_FILE}"
  echo "Redis backup saved to ${REDIS_FILE}"
else
  echo "redis-cli not found; skipping Redis backup" >&2
fi
