#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(pwd)/backend"

if [ ! -d "${BACKEND_DIR}" ]; then
  echo "Backend directory not found" >&2
  exit 1
fi

pushd "${BACKEND_DIR}" >/dev/null

if command -v pnpm >/dev/null 2>&1; then
  pnpm prisma migrate deploy
  pnpm prisma db seed
else
  npm run prisma migrate deploy
  npm run prisma db seed
fi

popd >/dev/null

echo "Production migrations complete."
