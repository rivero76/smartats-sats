#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

mkdir -p docs/sessions

ts="$(date +%Y-%m-%d_%H-%M-%S)"
branch="$(git branch --show-current)"
sha="$(git rev-parse --short HEAD)"
status="$(git status --short)"

note="${NOTE:-}"
if [ -z "$note" ]; then
  note="Checkpoint created via make checkpoint"
fi

template_path="docs/sessions/_TEMPLATE.md"
if [ ! -f "$template_path" ]; then
  echo "Missing template: $template_path" >&2
  exit 1
fi

session_file="${SESSION_FILE:-docs/sessions/${ts}.md}"

{
  cat "$template_path"
  echo
  echo "## Snapshot"
  echo "- Timestamp: ${ts}"
  echo "- Branch: ${branch}"
  echo "- Commit: ${sha}"
  echo "- Note: ${note}"
  echo
  echo "## Git Status (short)"
  echo '```text'
  if [ -n "$status" ]; then
    echo "$status"
  else
    echo "(clean)"
  fi
  echo '```'
} > "$session_file"

echo "Checkpoint written: $session_file"
