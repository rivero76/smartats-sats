#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi

OPS_LOG_DIR="$ROOT_DIR/ops/logs"
mkdir -p "$OPS_LOG_DIR"

usage() {
  cat <<'EOF'
SmartATS ops helper

Usage:
  bash ops/smartats.sh <command> [options]

Commands:
  dev-start [--build]       Start development container (smartats-dev)
  dev-stop                  Stop development container profile
  prod-start [--build]      Start production container (smartats-app)
  prod-stop                 Stop production container
  restart-dev [--build]     Restart development container
  restart-prod [--build]    Restart production container
  logs-dev [lines]          Show development logs
  logs-prod [lines]         Show production logs
  logs-dev-follow           Follow development logs
  logs-prod-follow          Follow production logs
  verify [--full]           Run verification checks and save a timestamped log
  llm-evals [--gate]        Run LLM eval metrics (and optional gate)
  supabase-check [--strict] Run Supabase operational checks
  health                    Show docker container status
  git-status                Print branch/status/last commit
  git-safe-push             Push current branch safely (requires clean working tree)
  help                      Show this help
EOF
}

run_with_timestamp_log() {
  local check_name="$1"
  shift

  local timestamp
  timestamp="$(date '+%Y-%m-%d_%H-%M-%S')"
  local log_file="$OPS_LOG_DIR/${check_name}_${timestamp}.log"
  local status=0

  set +e
  (
    set -e
    echo "check_name=$check_name"
    echo "started_at=$(date '+%Y-%m-%d %H:%M:%S')"
    echo "cwd=$ROOT_DIR"
    echo "command=$*"
    echo "----------------------------------------"
    "$@"
  ) 2>&1 | tee "$log_file"
  status=${PIPESTATUS[0]}
  set -e

  {
    echo "----------------------------------------"
    echo "finished_at=$(date '+%Y-%m-%d %H:%M:%S')"
    echo "exit_code=$status"
  } | tee -a "$log_file"

  echo "Saved log file: $log_file"
  return "$status"
}

run_verify() {
  local full="false"
  if [[ "${1:-}" == "--full" ]]; then
    full="true"
  fi

  run_with_timestamp_log "verify" bash -c "
    set -euo pipefail
    bash ops/check-format.sh
    npm run build
    bash ops/check-docs.sh
    bash ops/check-secrets.sh
    bash ops/check-supabase.sh
    if [[ \"$full\" == \"true\" ]]; then
      npm run lint
    fi
  "
}

run_llm_evals() {
  local mode="${1:-}"
  if [[ "$mode" == "--gate" ]]; then
    run_with_timestamp_log "llm_evals_gate" bash -c "
      set -euo pipefail
      bash ops/check-llm-evals.sh
    "
    return
  fi

  run_with_timestamp_log "llm_evals" bash -c "
    set -euo pipefail
    node ops/llm-evals/run-evals.mjs --input ops/llm-evals/reports/latest.responses.json
  "
}

git_safe_push() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree is not clean. Commit or stash changes first."
    exit 1
  fi

  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  git push --set-upstream origin "$branch"
}

cmd="${1:-help}"
arg="${2:-}"

case "$cmd" in
  dev-start)
    if [[ "$arg" == "--build" ]]; then
      $COMPOSE_CMD --profile dev up smartats-dev --build -d
    else
      $COMPOSE_CMD --profile dev up smartats-dev -d
    fi
    ;;
  dev-stop)
    $COMPOSE_CMD --profile dev down
    ;;
  prod-start)
    if [[ "$arg" == "--build" ]]; then
      $COMPOSE_CMD up smartats-app --build -d
    else
      $COMPOSE_CMD up smartats-app -d
    fi
    ;;
  prod-stop)
    $COMPOSE_CMD stop smartats-app
    ;;
  restart-dev)
    $COMPOSE_CMD --profile dev down
    if [[ "$arg" == "--build" ]]; then
      $COMPOSE_CMD --profile dev up smartats-dev --build -d
    else
      $COMPOSE_CMD --profile dev up smartats-dev -d
    fi
    ;;
  restart-prod)
    $COMPOSE_CMD stop smartats-app || true
    if [[ "$arg" == "--build" ]]; then
      $COMPOSE_CMD up smartats-app --build -d
    else
      $COMPOSE_CMD up smartats-app -d
    fi
    ;;
  logs-dev)
    $COMPOSE_CMD logs --tail "${arg:-200}" smartats-dev
    ;;
  logs-prod)
    $COMPOSE_CMD logs --tail "${arg:-200}" smartats-app
    ;;
  logs-dev-follow)
    $COMPOSE_CMD logs -f smartats-dev
    ;;
  logs-prod-follow)
    $COMPOSE_CMD logs -f smartats-app
    ;;
  verify)
    run_verify "${arg:-}"
    ;;
  llm-evals)
    run_llm_evals "${arg:-}"
    ;;
  supabase-check)
    bash ops/check-supabase.sh "${arg:-}"
    ;;
  health)
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
  git-status)
    echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
    git status --short
    echo
    git log -1 --oneline
    ;;
  git-safe-push)
    git_safe_push
    ;;
  help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd"
    usage
    exit 1
    ;;
esac
