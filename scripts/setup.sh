#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(pwd)

if command -v pnpm >/dev/null 2>&1; then
  PACKAGE_MANAGER="pnpm"
else
  PACKAGE_MANAGER="npm"
fi

echo "Using ${PACKAGE_MANAGER} for dependency installation"

${PACKAGE_MANAGER} install

pushd frontend >/dev/null
${PACKAGE_MANAGER} install
popd >/dev/null

pushd backend >/dev/null
${PACKAGE_MANAGER} install
popd >/dev/null

echo "Setup complete. Copy .env.example files to .env and configure secrets."
