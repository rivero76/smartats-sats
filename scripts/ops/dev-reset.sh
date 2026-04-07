#!/usr/bin/env bash
# UPDATE LOG
# 2026-04-02 | Created: dev data reset script. Wipes all end-user career data and
#               optionally lists auth accounts for manual cleanup. Dev project only —
#               aborts if run against an unrecognised project ref.
#
# Usage:
#   bash scripts/ops/dev-reset.sh               # dry-run (shows what would be deleted)
#   bash scripts/ops/dev-reset.sh --confirm     # executes the wipe
#   bash scripts/ops/dev-reset.sh --list-users  # lists auth accounts only, no wipe

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# The only project ref this script is permitted to run against.
# Update this if you create a dedicated staging project.
ALLOWED_PROJECT_REF="nkgscksbgmzhizohobhg"

# Read actual project ref from .env
PROJECT_REF=""
if [[ -f ".env" ]]; then
  PROJECT_REF="$(grep -E '^VITE_SUPABASE_PROJECT_ID=' .env | cut -d'"' -f2 | tr -d "'" | xargs 2>/dev/null || true)"
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

usage() {
  cat <<'EOF'

SmartATS dev-reset — wipes end-user career data from the dev Supabase project.

Usage:
  bash scripts/ops/dev-reset.sh               Dry-run: show row counts, no changes
  bash scripts/ops/dev-reset.sh --confirm     Execute the wipe (asks for confirmation)
  bash scripts/ops/dev-reset.sh --list-users  List auth accounts only, no wipe
  bash scripts/ops/dev-reset.sh --help        Show this message

What gets deleted (--confirm):
  sats_analyses, sats_enriched_experiences, sats_learning_roadmaps,
  sats_roadmap_milestones, sats_job_descriptions, document_extractions,
  sats_resumes, sats_user_skills, sats_skill_experiences, sats_skill_profiles,
  sats_resume_personas, sats_user_notifications, sats_staged_jobs,
  sats_account_deletion_logs

What is preserved:
  auth.users, profiles, sats_users_public, sats_user_roles,
  sats_user_role_assignments, sats_plans, sats_features, log_settings,
  sats_skill_decay_config, all schema / migrations

Note: auth.users accounts must be deleted manually via the Supabase Dashboard
(Authentication → Users). This script prints instructions after the wipe.

EOF
}

run_sql() {
  # Runs a SQL string against the linked remote project via supabase db query
  local sql="$1"
  supabase db query --linked --agent=no "$sql" 2>&1
}

# ---------------------------------------------------------------------------
# Safety guard — abort if not the allowed project
# ---------------------------------------------------------------------------

if [[ -z "$PROJECT_REF" ]]; then
  yellow "[WARN]  Could not read VITE_SUPABASE_PROJECT_ID from .env — proceeding with caution."
  yellow "        Target project ref: $ALLOWED_PROJECT_REF"
elif [[ "$PROJECT_REF" != "$ALLOWED_PROJECT_REF" ]]; then
  red    "[ABORT] Project ref in .env ($PROJECT_REF) does not match allowed dev project ($ALLOWED_PROJECT_REF)."
  red    "        This script must not run against an unrecognised project."
  exit 1
fi

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

CONFIRM=false
LIST_USERS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirm)    CONFIRM=true; shift ;;
    --list-users) LIST_USERS=true; shift ;;
    --help|-h)    usage; exit 0 ;;
    *) red "[ERROR] Unknown argument: $1"; usage; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# List auth users
# ---------------------------------------------------------------------------

LIST_USERS_SQL="
SELECT
  au.id,
  au.email,
  au.created_at,
  COALESCE(sur.role::text, 'no role') AS role
FROM auth.users au
LEFT JOIN public.sats_user_roles sur ON sur.user_id = au.id
ORDER BY au.created_at;
"

COUNT_SQL="
SELECT
  (SELECT COUNT(*) FROM public.sats_resumes)                AS resumes,
  (SELECT COUNT(*) FROM public.sats_job_descriptions)       AS job_descriptions,
  (SELECT COUNT(*) FROM public.sats_analyses)               AS analyses,
  (SELECT COUNT(*) FROM public.sats_enriched_experiences)   AS enriched_experiences,
  (SELECT COUNT(*) FROM public.sats_learning_roadmaps)      AS roadmaps,
  (SELECT COUNT(*) FROM public.sats_user_skills)            AS user_skills,
  (SELECT COUNT(*) FROM public.sats_skill_profiles)         AS skill_profiles,
  (SELECT COUNT(*) FROM public.sats_resume_personas)        AS resume_personas,
  (SELECT COUNT(*) FROM public.sats_user_notifications)     AS notifications,
  (SELECT COUNT(*) FROM public.sats_staged_jobs)            AS staged_jobs,
  (SELECT COUNT(*) FROM auth.users)                         AS auth_accounts;
"

WIPE_SQL="
-- Milestones (FK → roadmaps)
DELETE FROM public.sats_roadmap_milestones;
-- Roadmaps
DELETE FROM public.sats_learning_roadmaps;
-- Analyses
DELETE FROM public.sats_analyses;
-- Enriched experiences
DELETE FROM public.sats_enriched_experiences;
-- Job descriptions
DELETE FROM public.sats_job_descriptions;
-- Document extractions (FK → resumes)
DELETE FROM public.document_extractions;
-- Resumes
DELETE FROM public.sats_resumes;
-- Skill experiences
DELETE FROM public.sats_skill_experiences;
-- User skills
DELETE FROM public.sats_user_skills;
-- Skill profiles
DELETE FROM public.sats_skill_profiles;
-- Resume personas
DELETE FROM public.sats_resume_personas;
-- Notifications
DELETE FROM public.sats_user_notifications;
-- Staged jobs (mock / test data)
DELETE FROM public.sats_staged_jobs;
-- Deletion audit log
DELETE FROM public.sats_account_deletion_logs;
"

# List users only
if [[ "$LIST_USERS" == "true" ]]; then
  bold "Auth accounts in project $ALLOWED_PROJECT_REF:"
  run_sql "$LIST_USERS_SQL"
  echo ""
  yellow "To delete accounts: Supabase Dashboard → Authentication → Users"
  yellow "URL: https://supabase.com/dashboard/project/$ALLOWED_PROJECT_REF/auth/users"
  exit 0
fi

# ---------------------------------------------------------------------------
# Dry run — show counts
# ---------------------------------------------------------------------------

bold ""
bold "SmartATS Dev Reset — project: $ALLOWED_PROJECT_REF"
bold "=================================================="
echo ""
echo "Current row counts:"
run_sql "$COUNT_SQL"
echo ""

if [[ "$CONFIRM" == "false" ]]; then
  yellow "Dry-run mode — no changes made."
  yellow ""
  yellow "To execute the wipe:   bash scripts/ops/dev-reset.sh --confirm"
  yellow "To list auth accounts: bash scripts/ops/dev-reset.sh --list-users"
  exit 0
fi

# ---------------------------------------------------------------------------
# Confirmed wipe
# ---------------------------------------------------------------------------

echo ""
red    "WARNING: This will permanently delete all career data listed above."
red    "         auth.users accounts will NOT be deleted (manual step)."
echo ""
printf "Type the project ref to confirm (%s): " "$ALLOWED_PROJECT_REF"
read -r INPUT

if [[ "$INPUT" != "$ALLOWED_PROJECT_REF" ]]; then
  red "[ABORT] Input did not match. No changes made."
  exit 1
fi

echo ""
echo "[INFO]  Wiping career data..."
run_sql "$WIPE_SQL"
echo ""
green "[OK]    Career data wiped."
echo ""
echo "Row counts after reset:"
run_sql "$COUNT_SQL"

echo ""
bold   "Next step — delete auth accounts manually:"
yellow "  1. Open: https://supabase.com/dashboard/project/$ALLOWED_PROJECT_REF/auth/users"
yellow "  2. Delete all accounts except your admin account."
yellow "  3. Re-run to verify: bash scripts/ops/dev-reset.sh (dry-run)"
echo ""
bold   "Then regenerate types if you applied new migrations:"
yellow "  bash scripts/ops/gen-types.sh"
echo ""
