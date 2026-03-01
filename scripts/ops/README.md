# Ops Automation

`scripts/ops/` contains operational scripts for local lifecycle management, verification, and safety checks.

## Main entrypoint

```bash
bash scripts/ops/smartats.sh help
```

## Common commands

```bash
# Start dev container
bash scripts/ops/smartats.sh dev-start --build

# Start production container
bash scripts/ops/smartats.sh prod-start --build

# Follow logs
bash scripts/ops/smartats.sh logs-dev-follow
bash scripts/ops/smartats.sh logs-prod-follow

# Verification
bash scripts/ops/smartats.sh verify
bash scripts/ops/smartats.sh verify --full

# LLM prompt/model evals
bash scripts/ops/smartats.sh llm-evals
bash scripts/ops/smartats.sh llm-evals --gate

# Supabase operational checks
bash scripts/ops/smartats.sh supabase-check
bash scripts/ops/smartats.sh supabase-check --strict

# Git safety helpers
bash scripts/ops/smartats.sh git-status
bash scripts/ops/smartats.sh git-safe-push
```

## CI checks

- `scripts/ops/check-docs.sh`: required docs existence + doc updates when code changes.
- `scripts/ops/check-secrets.sh`: scans added diff lines for likely secret leaks.
- `scripts/ops/check-format.sh`: runs Prettier checks only on changed files.
- `scripts/ops/check-supabase.sh`: checks Supabase CLI, local status, migrations, and linked dry-run status.
- `scripts/ops/check-llm-evals.sh`: validates ATS/enrichment output-contract metrics against baseline thresholds.

## Verify logs

`bash scripts/ops/smartats.sh verify` writes a timestamped log file to:

`scripts/ops/logs/verify_YYYY-MM-DD_HH-MM-SS.log`
