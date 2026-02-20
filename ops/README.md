# Ops Automation

`ops/` contains operational scripts for local lifecycle management, verification, and safety checks.

## Main entrypoint

```bash
bash ops/smartats.sh help
```

## Common commands

```bash
# Start dev container
bash ops/smartats.sh dev-start --build

# Start production container
bash ops/smartats.sh prod-start --build

# Follow logs
bash ops/smartats.sh logs-dev-follow
bash ops/smartats.sh logs-prod-follow

# Verification
bash ops/smartats.sh verify
bash ops/smartats.sh verify --full

# Supabase operational checks
bash ops/smartats.sh supabase-check
bash ops/smartats.sh supabase-check --strict

# Git safety helpers
bash ops/smartats.sh git-status
bash ops/smartats.sh git-safe-push
```

## CI checks

- `ops/check-docs.sh`: required docs existence + doc updates when code changes.
- `ops/check-secrets.sh`: scans added diff lines for likely secret leaks.
- `ops/check-format.sh`: runs Prettier checks only on changed files.
- `ops/check-supabase.sh`: checks Supabase CLI, local status, migrations, and linked dry-run status.

## Verify logs

`bash ops/smartats.sh verify` writes a timestamped log file to:

`ops/logs/verify_YYYY-MM-DD_HH-MM-SS.log`
