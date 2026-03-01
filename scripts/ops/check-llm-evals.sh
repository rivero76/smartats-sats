#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RESPONSES_FILE="${1:-scripts/ops/llm-evals/reports/latest.responses.json}"
REPORT_FILE="scripts/ops/llm-evals/reports/latest.report.json"
THRESHOLDS_FILE="scripts/ops/llm-evals/baselines/thresholds.json"

if [[ ! -f "$RESPONSES_FILE" ]]; then
  echo "Missing eval responses file: $RESPONSES_FILE"
  echo "Generate template: node scripts/ops/llm-evals/run-evals.mjs --init-template --input $RESPONSES_FILE"
  exit 1
fi

node scripts/ops/llm-evals/run-evals.mjs \
  --input "$RESPONSES_FILE" \
  --output "$REPORT_FILE" \
  --thresholds "$THRESHOLDS_FILE" \
  --gate

echo "LLM eval gate passed. Report: $REPORT_FILE"
