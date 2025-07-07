#!/usr/bin/env bash

# Install AI tooling config and scripts
set -euo pipefail

# Global timestamp for consistent backup naming
DATETIME=$(date +"%Y%m%d_%H%M%S")

# Global array to track backed up files
declare -a BACKED_UP_FILES=()

# Function to sync directory with backup using rsync
sync_directory() {
    local src_dir="$1"
    local dest_dir="$2"
    
    mkdir -p "$dest_dir"
    
    # Use rsync with backup, suppressing verbose output
    rsync -a --backup --suffix="__${DATETIME}.bk" "$src_dir/" "$dest_dir/"
    
    # Find all backup files created by rsync
    while IFS= read -r -d '' backup_file; do
        BACKED_UP_FILES+=("$backup_file")
    done < <(find "$dest_dir" -name "*__${DATETIME}.bk" -type f -print0 2>/dev/null || true)
}

# Function to copy single file with backup
copy_file_with_backup() {
    local src="$1"
    local dest="$2"
    
    mkdir -p "$(dirname "$dest")"
    
    # Use rsync for consistency
    rsync -a --backup --suffix="__${DATETIME}.bk" "$src" "$dest"
    
    # Check if backup was created
    local backup_path="${dest}__${DATETIME}.bk"
    if [[ -f "$backup_path" ]]; then
        BACKED_UP_FILES+=("$backup_path")
    fi
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting AI tooling installation..."
echo "Script directory: $SCRIPT_DIR"

# 1. cursor/rules -> .cursor/rules in current working directory
if [[ -d "$SCRIPT_DIR/cursor/rules" ]]; then
    echo "Syncing cursor/rules -> $(pwd)/.cursor/rules"
    sync_directory "$SCRIPT_DIR/cursor/rules" "$(pwd)/.cursor/rules"
fi

# 2. agent-docs -> ~/.claude/agent-docs
if [[ -d "$SCRIPT_DIR/agent-docs" ]]; then
    echo "Syncing agent-docs -> ~/.claude/agent-docs"
    sync_directory "$SCRIPT_DIR/agent-docs" "$HOME/.claude/agent-docs"
fi

# 3. commands/ -> ~/.claude/commands
if [[ -d "$SCRIPT_DIR/commands" ]]; then
    echo "Syncing commands -> ~/.claude/commands"
    sync_directory "$SCRIPT_DIR/commands" "$HOME/.claude/commands"
fi

# 4. scripts/lgit -> ~/.local/bin/lgit
if [[ -f "$SCRIPT_DIR/scripts/lgit" ]]; then
    copy_file_with_backup "$SCRIPT_DIR/scripts/lgit" "$HOME/.local/bin/lgit"
    chmod +x "$HOME/.local/bin/lgit"
fi

# 5. Install Claude Code settings using TypeScript installer
if [[ -f "$SCRIPT_DIR/claude/settings.json" && -f "$SCRIPT_DIR/typescript/scripts/install-settings.ts" ]]; then
    echo "Installing Claude Code settings..."
    if command -v bun &> /dev/null; then
        if bun run "$SCRIPT_DIR/typescript/scripts/install-settings.ts" "$SCRIPT_DIR/claude/settings.json"; then
            echo "Claude Code settings installed successfully"
        else
            echo "Warning: Failed to install Claude Code settings"
        fi
    else
        echo "Warning: bun not found, skipping Claude Code settings installation"
        echo "Install bun to enable settings installation: https://bun.sh"
    fi
fi

echo ""
echo "Installation complete!"

# Print list of backed up files
if [[ ${#BACKED_UP_FILES[@]} -gt 0 ]]; then
    echo ""
    echo "Files backed up:"
    for backup in "${BACKED_UP_FILES[@]}"; do
        echo "  - $backup"
    done
else
    echo ""
    echo "No files were backed up (no conflicts found)."
fi