#!/usr/bin/env bash
# UPDATE LOG
# 2026-03-18 | CR4-1: Install git pre-commit hooks for this repo.
#              Run once after cloning: bash scripts/ops/install-hooks.sh
#
# Installs:
#   .git/hooks/pre-commit  →  runs check-update-log.sh before every commit

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPT_DIR="$REPO_ROOT/scripts/ops"

echo "Installing git hooks..."

cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/usr/bin/env bash
# Auto-installed by scripts/ops/install-hooks.sh
set -e
bash "$(git rev-parse --show-toplevel)/scripts/ops/check-update-log.sh"
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo "  ✓ pre-commit → scripts/ops/check-update-log.sh"
echo ""
echo "Done. Hooks are active for this local clone."
echo "Other contributors must run: bash scripts/ops/install-hooks.sh"
