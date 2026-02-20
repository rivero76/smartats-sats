#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

CHANGED_FILES="$(git diff --name-only "$BASE_SHA" "$HEAD_SHA")"
WORKTREE_FILES="$(git diff --name-only || true)"
STAGED_FILES="$(git diff --name-only --cached || true)"
UNTRACKED_FILES="$(git ls-files --others --exclude-standard || true)"

ALL_CHANGED="$(printf "%s\n%s\n%s\n%s\n" "$CHANGED_FILES" "$WORKTREE_FILES" "$STAGED_FILES" "$UNTRACKED_FILES" | sed '/^$/d' | sort -u)"

if [[ -z "$ALL_CHANGED" ]]; then
  echo "No changed files to format-check."
  exit 0
fi

TARGET_FILES="$(echo "$ALL_CHANGED" | grep -E '\.(ts|tsx|js|jsx|json|md|mdx|yml|yaml|css|scss)$' || true)"
if [[ -z "$TARGET_FILES" ]]; then
  echo "No supported changed files to format-check."
  exit 0
fi

# shellcheck disable=SC2086
npx prettier --check $TARGET_FILES
