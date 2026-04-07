#!/usr/bin/env bash
# scripts/ops/fly.sh — Fly.io CLI wrapper (runs flyctl inside Docker, no local install needed)
#
# UPDATE LOG
# 2026-03-31 | Initial creation — Docker-based flyctl wrapper for LinkedIn scraper deploy (INFRA-1)
# 2026-03-31 | Switch to token-based auth (FLY_API_TOKEN) — browser callback doesn't work in Docker.
#               Reads token from .env or FLY_API_TOKEN env var. Use arm64 platform image on Apple Silicon.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRAPER_DIR="$ROOT_DIR/scripts/playwright-linkedin"
# Use arm64 platform to avoid emulation warnings on Apple Silicon
FLYCTL_IMAGE="flyio/flyctl:latest"
PLATFORM_FLAG="--platform linux/arm64"

# ── Auth — load FLY_API_TOKEN from .env if not already set ───────────────────
if [[ -z "${FLY_API_TOKEN:-}" ]] && [[ -f "$ROOT_DIR/.env" ]]; then
  FLY_API_TOKEN="$(grep -E '^FLY_API_TOKEN=' "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi

# Ensure Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "[fly.sh] ERROR: Docker is not running. Start Docker Desktop first." >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Fly.io CLI wrapper — runs flyctl in Docker (no local install required)

Auth: set FLY_API_TOKEN in .env or export it before running.
  Generate a token at: https://fly.io/user/personal_access_tokens

Usage:
  bash scripts/ops/fly.sh <flyctl-command> [args...]

Common commands:
  bash scripts/ops/fly.sh auth whoami              # Verify token is working
  bash scripts/ops/fly.sh launch --no-deploy       # Init app from fly.toml (first time only)
  bash scripts/ops/fly.sh deploy                   # Build & deploy the scraper to Fly.io
  bash scripts/ops/fly.sh status                   # Show app status + public URL
  bash scripts/ops/fly.sh logs                     # Tail live logs
  bash scripts/ops/fly.sh secrets set KEY=val      # Set environment secrets
  bash scripts/ops/fly.sh secrets list             # List secret names (values hidden)

All commands run from scripts/playwright-linkedin/ (where fly.toml lives).

EOF
}

if [[ $# -eq 0 ]] || [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "${FLY_API_TOKEN:-}" ]]; then
  echo "[fly.sh] ERROR: FLY_API_TOKEN is not set." >&2
  echo "[fly.sh] Add FLY_API_TOKEN=<token> to your .env file." >&2
  echo "[fly.sh] Generate a token at: https://fly.io/user/personal_access_tokens" >&2
  exit 1
fi

echo "[fly.sh] Running: flyctl $*"
echo "[fly.sh] Context: $SCRAPER_DIR"
echo ""

docker run --rm -it \
  $PLATFORM_FLAG \
  -e FLY_API_TOKEN="$FLY_API_TOKEN" \
  -v "$SCRAPER_DIR:/app" \
  -w /app \
  "$FLYCTL_IMAGE" \
  "$@"
