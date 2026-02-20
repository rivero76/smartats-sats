# Changelog

All notable changes to this project should be documented in this file.

## [Unreleased]

- Added `ops/` operational automation scripts for container lifecycle, verification, logs, and safe git push flows.
- Added CI workflow `.github/workflows/quality-gates.yml` with build, format, docs gate, and secrets gate checks.
- Added `ops/check-format.sh` for changed-files Prettier checks to support incremental adoption.
- Added `ops/check-docs.sh` to require documentation updates when code or infrastructure changes.
- Added `ops/check-secrets.sh` to scan added diff lines for potential secret leaks.
- Added `ops/check-supabase.sh` for Supabase CLI/local-status/migration/linked dry-run checks.
- Updated `ops/smartats.sh verify` to always generate timestamped execution logs under `ops/logs/`.
