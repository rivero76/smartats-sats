#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

strict="false"
if [[ "${1:-}" == "--strict" ]]; then
  strict="true"
fi

warn_count=0
fail_count=0

warn() {
  warn_count=$((warn_count + 1))
  echo "[WARN] $1"
}

fail() {
  fail_count=$((fail_count + 1))
  echo "[FAIL] $1"
}

run_cmd() {
  local label="$1"
  shift
  echo
  echo ">>> $label"
  set +e
  "$@"
  local status=$?
  set -e
  if [[ $status -ne 0 ]]; then
    fail "$label (exit_code=$status)"
  else
    echo "[OK] $label"
  fi
}

echo "Supabase operational check"
echo "timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

if ! command -v supabase >/dev/null 2>&1; then
  echo "[FAIL] Supabase CLI is not installed."
  exit 1
fi

echo "[OK] Supabase CLI found"
supabase --version || true

if [[ ! -f "supabase/config.toml" ]]; then
  fail "supabase/config.toml not found in repository"
else
  echo "[OK] supabase/config.toml found"
fi

if [[ ! -d "supabase/migrations" ]]; then
  fail "supabase/migrations directory not found"
else
  local_count="$(find supabase/migrations -type f | wc -l | tr -d ' ')"
  echo "[OK] migrations directory found ($local_count files)"
fi

# Local Supabase stack status
set +e
status_output="$(supabase status 2>&1)"
status_exit=$?
set -e
echo
echo ">>> supabase status"
echo "$status_output"
if [[ $status_exit -ne 0 ]]; then
  warn "supabase status could not confirm local stack (exit_code=$status_exit)"
else
  echo "[OK] local supabase status command succeeded"
fi

# Linked project checks are optional unless strict mode is requested.
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  run_cmd "supabase migration list --linked" supabase migration list --linked
  run_cmd "supabase db push --dry-run" supabase db push --dry-run
else
  msg="SUPABASE_ACCESS_TOKEN not set; skipping linked project checks."
  if [[ "$strict" == "true" ]]; then
    fail "$msg"
  else
    warn "$msg"
  fi
fi

echo
echo "Supabase check summary: fails=$fail_count warnings=$warn_count"

if [[ $fail_count -gt 0 ]]; then
  exit 1
fi

if [[ "$strict" == "true" && $warn_count -gt 0 ]]; then
  exit 1
fi
