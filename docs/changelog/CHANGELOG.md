# Changelog

All notable changes to this project should be documented in this file.

## [Unreleased]

- Added `scripts/ops/` operational automation scripts for container lifecycle, verification, logs, and safe git push flows.
- Added CI workflow `.github/workflows/quality-gates.yml` with build, format, docs gate, and secrets gate checks.
- Added `scripts/ops/check-format.sh` for changed-files Prettier checks to support incremental adoption.
- Added `scripts/ops/check-docs.sh` to require documentation updates when code or infrastructure changes.
- Added `scripts/ops/check-secrets.sh` to scan added diff lines for potential secret leaks.
- Added `scripts/ops/check-supabase.sh` for Supabase CLI/local-status/migration/linked dry-run checks.
- Updated `scripts/ops/smartats.sh verify` to always generate timestamped execution logs under `scripts/ops/logs/`.
