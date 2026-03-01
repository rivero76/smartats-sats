#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-HEAD}"

if [[ -z "$BASE_SHA" ]]; then
  if git rev-parse HEAD~1 >/dev/null 2>&1; then
    BASE_SHA="HEAD~1"
  else
    BASE_SHA="HEAD"
  fi
fi

DIFF_ADDED_LINES="$(git diff --unified=0 "$BASE_SHA" "$HEAD_SHA" | grep '^+' | grep -v '^+++ ' || true)"
if [[ -z "$DIFF_ADDED_LINES" ]]; then
  echo "No added lines to scan."
  exit 0
fi

PATTERN='(sbp_[A-Za-z0-9_]{10,}|sb_secret_[A-Za-z0-9_]{10,}|service_role[[:space:]]*=|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY[[:space:]]*=|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})'

if echo "$DIFF_ADDED_LINES" | grep -E "$PATTERN" >/dev/null; then
  echo "Potential secret detected in added lines."
  echo "Remove secrets from code and use environment variables/secrets manager."
  exit 1
fi

echo "Secret scan passed for added lines."
