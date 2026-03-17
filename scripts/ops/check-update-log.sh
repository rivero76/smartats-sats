#!/usr/bin/env bash
# UPDATE LOG
# 2026-03-18 | CR4-1: Pre-commit check — reject staged files in src/, supabase/functions/,
#              supabase/migrations/ that are missing a mandatory UPDATE LOG header.
#              Per CLAUDE.md §6.2. Run via .git/hooks/pre-commit or CI.
#
# Usage (CI):  bash scripts/ops/check-update-log.sh
# Usage (git): installed automatically by scripts/ops/install-hooks.sh

set -euo pipefail

SCOPED_DIRS="^(src|supabase/functions|supabase/migrations)/"
HEADER_PATTERN="UPDATE LOG|-- UPDATE LOG|<!-- UPDATE LOG"

# In CI there are no staged files; check the full diff against main instead.
# In a local commit context, check only staged files.
if [[ "${CI:-}" == "true" ]]; then
  FILES=$(git diff --name-only origin/main...HEAD --diff-filter=ACM 2>/dev/null || true)
else
  FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
fi

FAILED=0

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  # Only scope to tracked directories
  if [[ ! "$file" =~ $SCOPED_DIRS ]]; then
    continue
  fi
  # Only check text source files
  if [[ ! "$file" =~ \.(ts|tsx|js|jsx|sql|html)$ ]]; then
    continue
  fi
  # Skip auto-generated files
  if [[ "$file" == "src/integrations/supabase/types.ts" ]]; then
    continue
  fi
  if [[ ! -f "$file" ]]; then
    continue
  fi
  if ! head -25 "$file" | grep -qE "$HEADER_PATTERN"; then
    echo "  MISSING UPDATE LOG: $file"
    FAILED=1
  fi
done <<< "$FILES"

if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "ERROR: One or more files are missing a mandatory UPDATE LOG header."
  echo "Add the following block near the top of each flagged file:"
  echo ""
  echo "  TypeScript/JS:  /** UPDATE LOG"
  echo "                   * YYYY-MM-DD HH:MM:SS | <description>"
  echo "                   */"
  echo "  SQL:            -- UPDATE LOG"
  echo "                  -- YYYY-MM-DD HH:MM:SS | <description>"
  echo ""
  echo "See CLAUDE.md §6.2 for the full convention."
  exit 1
fi

echo "UPDATE LOG check passed."
exit 0
