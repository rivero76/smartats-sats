#!/usr/bin/env bash
# scripts/ops/fly.sh — Fly.io CLI wrapper (runs flyctl inside Docker, no local install needed)
#
# UPDATE LOG
# 2026-03-31 | Initial creation — Docker-based flyctl wrapper for LinkedIn scraper deploy (INFRA-1)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRAPER_DIR="$ROOT_DIR/scripts/playwright-linkedin"
FLY_AUTH_DIR="$HOME/.fly"
FLYCTL_IMAGE="flyio/flyctl:latest"

# Ensure Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "[fly.sh] ERROR: Docker is not running. Start Docker Desktop first." >&2
  exit 1
fi

# Ensure auth state directory exists (persists login between runs)
mkdir -p "$FLY_AUTH_DIR"

usage() {
  cat <<'EOF'
Fly.io CLI wrapper — runs flyctl in Docker (no local install required)

Usage:
  bash scripts/ops/fly.sh <flyctl-command> [args...]

Common commands:
  bash scripts/ops/fly.sh auth login          # Authenticate (opens browser)
  bash scripts/ops/fly.sh auth whoami         # Check current logged-in user
  bash scripts/ops/fly.sh launch --no-deploy  # Init app from fly.toml (first time only)
  bash scripts/ops/fly.sh deploy              # Build & deploy the scraper to Fly.io
  bash scripts/ops/fly.sh status              # Show app status + public URL
  bash scripts/ops/fly.sh logs                # Tail live logs
  bash scripts/ops/fly.sh secrets set KEY=val # Set environment secrets
  bash scripts/ops/fly.sh secrets list        # List secret names (values hidden)
  bash scripts/ops/fly.sh open                # Open app in browser

All commands run from scripts/playwright-linkedin/ (where fly.toml lives).
Auth state is persisted in ~/.fly so you only need to login once.

EOF
}

if [[ $# -eq 0 ]] || [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

echo "[fly.sh] Running: flyctl $*"
echo "[fly.sh] Context: $SCRAPER_DIR"
echo ""

docker run --rm -it \
  -v "$FLY_AUTH_DIR:/root/.fly" \
  -v "$SCRAPER_DIR:/app" \
  -w /app \
  "$FLYCTL_IMAGE" \
  "$@"
