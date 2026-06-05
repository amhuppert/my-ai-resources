#!/usr/bin/env bash
set -euo pipefail

# Command Center runs this after creating a session worktree (cwd = new worktree).
# PARENT_WORKTREE_PATH is the worktree this session was branched from, or
# PROJECT_ROOT when branched off the main branch.
SOURCE_WORKTREE="${PARENT_WORKTREE_PATH:-${PROJECT_ROOT:-}}"

if [ -z "$SOURCE_WORKTREE" ]; then
  echo "Error: neither PARENT_WORKTREE_PATH nor PROJECT_ROOT is set." >&2
  exit 1
fi

WORKTREE_DIR="$(pwd)"

copy_dir_if_exists() {
  local source_dir="$1"
  local destination_dir="$2"
  local label="$3"

  if [ -d "$source_dir" ]; then
    mkdir -p "$destination_dir"
    cp -a "$source_dir/." "$destination_dir/"
    echo "  ✓ Copied $label"
  fi
}

echo "Seeding worktree context from: $SOURCE_WORKTREE"

copy_dir_if_exists "$SOURCE_WORKTREE/memory-bank" "$WORKTREE_DIR/memory-bank" "memory-bank"
copy_dir_if_exists "$SOURCE_WORKTREE/.kiro" "$WORKTREE_DIR/.kiro" ".kiro"

echo "✓ Worktree context seeding complete"
