#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_files=(
  "README.md"
  "PRODUCT_IMPROVEMENTS.md"
  "SATS_CHANGES.txt"
  "docs/changelog/CHANGELOG.md"
  "docs/help/README.md"
  "docs/runbooks/incident-response.md"
  "docs/runbooks/rollback.md"
  "docs/runbooks/deployment.md"
  "docs/compliance/data-retention-policy.md"
  "docs/compliance/data-deletion-policy.md"
  "docs/compliance/audit-trail-policy.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Missing or empty required documentation file: $file"
    exit 1
  fi
done

BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-HEAD}"

if [[ -z "$BASE_SHA" ]]; then
  if git rev-parse HEAD~1 >/dev/null 2>&1; then
    BASE_SHA="HEAD~1"
  else
    exit 0
  fi
fi

CHANGED_FILES="$(git diff --name-only "$BASE_SHA" "$HEAD_SHA")"
WORKTREE_FILES="$(git diff --name-only || true)"
STAGED_FILES="$(git diff --name-only --cached || true)"
UNTRACKED_FILES="$(git ls-files --others --exclude-standard || true)"
if [[ -n "$WORKTREE_FILES" ]]; then
  CHANGED_FILES="$(printf "%s\n%s\n" "$CHANGED_FILES" "$WORKTREE_FILES")"
fi
if [[ -n "$STAGED_FILES" ]]; then
  CHANGED_FILES="$(printf "%s\n%s\n" "$CHANGED_FILES" "$STAGED_FILES")"
fi
if [[ -n "$UNTRACKED_FILES" ]]; then
  CHANGED_FILES="$(printf "%s\n%s\n" "$CHANGED_FILES" "$UNTRACKED_FILES")"
fi

if [[ -z "$CHANGED_FILES" ]]; then
  exit 0
fi

if echo "$CHANGED_FILES" | grep -Eq '^(src/|supabase/|ops/|Dockerfile|Dockerfile.dev|docker-compose.yml|\.github/workflows/)'; then
  if ! echo "$CHANGED_FILES" | grep -Eq '^(README\.md|SATS_CHANGES\.txt|PRODUCT_IMPROVEMENTS\.md|docs/|ops/README\.md)'; then
    echo "Code/infrastructure changed, but no docs were updated."
    echo "Update at least one of: README.md, SATS_CHANGES.txt, PRODUCT_IMPROVEMENTS.md, docs/*."
    exit 1
  fi

  if ! echo "$CHANGED_FILES" | grep -Eq '^docs/changelog/CHANGELOG\.md$'; then
    echo "Code/infrastructure changed, but docs/changelog/CHANGELOG.md was not updated."
    exit 1
  fi
fi

echo "Documentation checks passed."
