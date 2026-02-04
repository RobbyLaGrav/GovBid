#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=${1:-"staging"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

if [ "${ENVIRONMENT}" = "production" ]; then
  COMPOSE_FILE="infrastructure/docker/docker-compose.prod.yml"
else
  COMPOSE_FILE="infrastructure/docker/docker-compose.dev.yml"
fi

echo "Deploying GovBid Pro (${ENVIRONMENT}) using ${COMPOSE_FILE}"

docker compose -f "${COMPOSE_FILE}" pull

docker compose -f "${COMPOSE_FILE}" up -d

echo "Deployment complete."
