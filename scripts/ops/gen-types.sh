#!/usr/bin/env bash
# UPDATE LOG
# 2026-03-17 12:00:00 | P1-7: script to regenerate Supabase TypeScript types from live schema
#
# Usage: bash scripts/ops/gen-types.sh
#
# Run this after every migration. Requires the Supabase CLI and SUPABASE_PROJECT_ID
# to be set (or hard-coded below for convenience).
#
# The generated file (src/integrations/supabase/types.ts) is auto-generated — do NOT edit it manually.

set -euo pipefail

PROJECT_ID="${SUPABASE_PROJECT_ID:-nkgscksbgmzhizohobhg}"
OUTPUT="src/integrations/supabase/types.ts"

echo "[gen-types] Regenerating Supabase types for project: $PROJECT_ID"
supabase gen types typescript --project-id "$PROJECT_ID" > "$OUTPUT"
echo "[gen-types] Written to $OUTPUT"
