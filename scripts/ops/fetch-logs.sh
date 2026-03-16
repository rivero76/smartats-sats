#!/usr/bin/env bash
# UPDATE LOG
# 2026-03-17 12:00:00 | Created: interactive log fetch from Supabase (log_entries table + platform API) and Docker containers
# 2026-03-17 13:00:00 | Fixed: replaced echo -e with printf (sh compatibility); improved missing-credentials message
#
# Usage (must run with bash, not sh):
#   bash scripts/ops/fetch-logs.sh [--source app|platform|docker|all] [--minutes N]
#
# Sources:
#   app       Query log_entries table via Supabase REST API (requires SUPABASE_SERVICE_KEY + VITE_SUPABASE_URL in .env)
#   platform  Query Supabase Management API for edge function / postgres logs (requires SUPABASE_ACCESS_TOKEN in .env)
#   docker    Docker container logs for smartats-app / smartats-dev (no credentials needed)
#   all       All three sources (default)
#
# Credentials are read from .env in the project root:
#   VITE_SUPABASE_URL     — e.g. https://nkgscksbgmzhizohobhg.supabase.co
#   SUPABASE_SERVICE_KEY  — service_role key from Supabase Dashboard → Project Settings → API
#   SUPABASE_ACCESS_TOKEN — personal access token from https://supabase.com/dashboard/account/tokens
#   SUPABASE_PROJECT_ID   — project ref (default: nkgscksbgmzhizohobhg)
#
# Output:
#   Saved to logs/tmp/sats-logs-YYYYMMDD-HHMMSS-<source>.{json,txt}

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/../.." && pwd)"
cd "$ROOT_DIR"

# ── Colour helpers — use printf to work in both bash and sh ───────────────────
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
BOLD="\033[1m"
RESET="\033[0m"

info()  { printf "${CYAN}[INFO]${RESET}  %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${RESET}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${RESET}  %s\n" "$*"; }
err()   { printf "${RED}[ERROR]${RESET} %s\n" "$*" >&2; }

# ── Parse args ─────────────────────────────────────────────────────────────────
SOURCE="all"
MINUTES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)  SOURCE="$2";  shift 2 ;;
    --minutes) MINUTES="$2"; shift 2 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── Interactive prompt for time window ────────────────────────────────────────
if [[ -z "$MINUTES" ]]; then
  printf "${BOLD}SmartATS Log Fetch${RESET}\n"
  printf -- "──────────────────────────────────────────────\n"
  while true; do
    read -rp "Time window to collect logs (1–10 minutes): " MINUTES
    if [[ "$MINUTES" =~ ^[0-9]+$ ]] && (( MINUTES >= 1 && MINUTES <= 10 )); then
      break
    fi
    warn "Please enter a number between 1 and 10."
  done
fi

if (( MINUTES < 1 || MINUTES > 10 )); then
  err "Minutes must be between 1 and 10. Got: $MINUTES"
  exit 1
fi

# ── Load .env (project root) ──────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" == *"="* ]] || continue
    export "$line" 2>/dev/null || true
  done < .env
fi

SUPABASE_URL="${VITE_SUPABASE_URL:-}"
PROJECT_ID="${SUPABASE_PROJECT_ID:-nkgscksbgmzhizohobhg}"
SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"

# ── Output directory ───────────────────────────────────────────────────────────
LOGDIR="$ROOT_DIR/logs/tmp"
mkdir -p "$LOGDIR"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"

printf "\n"
info "Collecting logs — last ${MINUTES} minute(s) — source: ${SOURCE}"
info "Output directory: logs/tmp/"
printf "\n"

# ── Source: app (log_entries table via REST API) ───────────────────────────────
fetch_app_logs() {
  if [[ -z "$SERVICE_KEY" || -z "$SUPABASE_URL" ]]; then
    warn "Skipping 'app' source — credentials not found in .env"
    printf "        To enable: add to your .env file:\n"
    printf "          VITE_SUPABASE_URL=https://<ref>.supabase.co\n"
    printf "          SUPABASE_SERVICE_KEY=<service_role key>\n"
    printf "        Find the service_role key at:\n"
    printf "          Supabase Dashboard → %s → Project Settings → API\n" "$PROJECT_ID"
    return
  fi

  local since
  since="$(date -u -v-${MINUTES}M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null \
    || date -u --date="${MINUTES} minutes ago" '+%Y-%m-%dT%H:%M:%SZ')"

  local outfile="$LOGDIR/sats-logs-${TIMESTAMP}-app.json"
  info "Querying log_entries (since ${since}) ..."

  local response http_code body
  response=$(curl -s -w "\n%{http_code}" \
    "${SUPABASE_URL}/rest/v1/log_entries?timestamp=gte.${since}&order=timestamp.desc&limit=500" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation")
  http_code=$(printf '%s' "$response" | tail -1)
  body=$(printf '%s' "$response" | head -n -1)

  if [[ "$http_code" == "200" ]]; then
    printf '%s' "$body" | python3 -m json.tool 2>/dev/null > "$outfile" || printf '%s' "$body" > "$outfile"
    local count
    count=$(printf '%s' "$body" | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || printf '?')
    ok "app logs: ${count} entries → ${outfile}"
    printf '%s' "$body" | python3 -c "
import json, sys
try:
    entries = json.load(sys.stdin)
    for e in entries[:20]:
        ts  = e.get('timestamp','')[:19]
        lvl = e.get('log_level','?').ljust(5)
        fn  = e.get('script_name','?')[:30]
        msg = e.get('message','')[:100]
        print(f'  {ts}  {lvl}  {fn:<30}  {msg}')
    if len(entries) > 20:
        print(f'  ... ({len(entries)-20} more — see the output file)')
except Exception as ex:
    print(f'  (Could not parse JSON: {ex})')
" 2>/dev/null || printf "  (Raw response saved to %s)\n" "$outfile"
  else
    warn "app log query returned HTTP ${http_code} — response saved to ${outfile}"
    printf '%s' "$body" > "$outfile"
  fi
}

# ── Source: platform (Supabase Management API) ────────────────────────────────
fetch_platform_logs() {
  if [[ -z "$ACCESS_TOKEN" ]]; then
    warn "Skipping 'platform' source — SUPABASE_ACCESS_TOKEN not found in .env"
    printf "        To enable: add to your .env file:\n"
    printf "          SUPABASE_ACCESS_TOKEN=<personal-access-token>\n"
    printf "        Generate one at: https://supabase.com/dashboard/account/tokens\n"
    return
  fi

  local since until
  since="$(date -u -v-${MINUTES}M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null \
    || date -u --date="${MINUTES} minutes ago" '+%Y-%m-%dT%H:%M:%SZ')"
  until="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

  local outfile="$LOGDIR/sats-logs-${TIMESTAMP}-platform.json"
  info "Querying Supabase platform logs (edge functions, last ${MINUTES}m) ..."

  local sql="SELECT t, event_message FROM edge_logs WHERE t >= '${since}' ORDER BY t DESC LIMIT 200"
  local encoded_sql
  encoded_sql=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$sql" 2>/dev/null \
    || printf '%s' "$sql" | sed 's/ /%20/g;s/,/%2C/g;s/=/%3D/g;s/>/%3E/g;s/'\''/%27/g')

  local response http_code body
  response=$(curl -s -w "\n%{http_code}" \
    "https://api.supabase.com/v1/projects/${PROJECT_ID}/logs?sql=${encoded_sql}&iso_timestamp_start=${since}&iso_timestamp_end=${until}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")
  http_code=$(printf '%s' "$response" | tail -1)
  body=$(printf '%s' "$response" | head -n -1)

  if [[ "$http_code" == "200" ]]; then
    printf '%s' "$body" | python3 -m json.tool 2>/dev/null > "$outfile" || printf '%s' "$body" > "$outfile"
    ok "platform logs → ${outfile}"
    printf '%s' "$body" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    rows = data.get('result', [])
    for r in rows[:20]:
        ts  = str(r.get('t',''))[:19]
        msg = str(r.get('event_message',''))[:120]
        print(f'  {ts}  {msg}')
    if len(rows) > 20:
        print(f'  ... ({len(rows)-20} more — see the output file)')
except Exception as ex:
    print(f'  (Could not parse response: {ex})')
" 2>/dev/null || printf "  (Raw response saved to %s)\n" "$outfile"
  else
    warn "Platform log query returned HTTP ${http_code} — response saved to ${outfile}"
    printf '%s' "$body" > "$outfile"
  fi
}

# ── Source: docker ─────────────────────────────────────────────────────────────
fetch_docker_logs() {
  local containers=("smartats-app" "smartats-dev")

  for container in "${containers[@]}"; do
    if ! docker ps --filter "name=^/${container}$" --format '{{.Names}}' 2>/dev/null | grep -q "$container"; then
      warn "Container '${container}' is not running — skipping."
      continue
    fi

    local outfile="$LOGDIR/sats-logs-${TIMESTAMP}-${container}.txt"
    info "Fetching Docker logs for '${container}' (last ${MINUTES}m) ..."

    docker logs "$container" --since "${MINUTES}m" 2>&1 | tee "$outfile"
    local lines
    lines=$(wc -l < "$outfile" | tr -d ' ')
    ok "${container} → ${outfile} (${lines} lines)"
  done
}

# ── Run selected sources ───────────────────────────────────────────────────────
case "$SOURCE" in
  app)      fetch_app_logs ;;
  platform) fetch_platform_logs ;;
  docker)   fetch_docker_logs ;;
  all)
    fetch_app_logs;      printf "\n"
    fetch_platform_logs; printf "\n"
    fetch_docker_logs
    ;;
  *)
    err "Unknown source: ${SOURCE}. Use: app, platform, docker, or all"
    exit 1
    ;;
esac

printf "\n"
info "Done. Log files saved to logs/tmp/"
info "To clean up: bash scripts/ops/clean-logs.sh"
