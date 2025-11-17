#!/bin/bash
# Sample Testing Wrapper
# Usage:
#   pnpm test:sample                    # Use current run_latest symlink
#   pnpm test:sample run_20251117_1828  # Update symlink to specified run

set -e

# Get project root (script is in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BASELINE_ARG="${1:-}"

# Function to update symlink
update_symlink() {
  local target="$1"
  echo "🔗 Updating baseline symlink: runs/run_latest -> $target"
  rm -f "$PROJECT_ROOT/runs/run_latest"
  ln -s "$target" "$PROJECT_ROOT/runs/run_latest"
}

# If baseline argument provided, update symlink
if [ -n "$BASELINE_ARG" ]; then
  # Validate target directory exists
  if [ ! -d "$PROJECT_ROOT/runs/$BASELINE_ARG" ]; then
    echo "❌ Error: Baseline directory not found: runs/$BASELINE_ARG"
    echo ""
    echo "Available runs:"
    ls -t "$PROJECT_ROOT/runs" | grep "^run_" | head -5
    exit 1
  fi

  update_symlink "$BASELINE_ARG"
else
  # Check if run_latest exists
  if [ ! -L "$PROJECT_ROOT/runs/run_latest" ]; then
    echo "❌ Error: runs/run_latest symlink does not exist"
    echo ""
    echo "Please provide a baseline run directory:"
    echo "  pnpm test:sample <run_directory>"
    echo ""
    echo "Available runs:"
    ls -t "$PROJECT_ROOT/runs" | grep "^run_" | head -5
    exit 1
  fi

  # Show current baseline
  CURRENT_TARGET="$(readlink "$PROJECT_ROOT/runs/run_latest")"
  echo "ℹ️  Using current baseline: runs/run_latest -> $CURRENT_TARGET"
fi

echo ""

# Run the actual sample testing workflow
cd "$PROJECT_ROOT/packages/ocr-match-core"
exec pnpm sample-internal
