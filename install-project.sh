#!/usr/bin/env bash

# Install AI tooling project-level config
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common helper functions
source "$SCRIPT_DIR/lib/helpers.sh"

print_installation_header "project-level" "$SCRIPT_DIR"

# 1. cursor/rules -> .cursor/rules in current working directory
install_directory "$SCRIPT_DIR/cursor/rules" "$(pwd)/.cursor/rules" "Syncing cursor/rules -> $(pwd)/.cursor/rules"

# 2. claude/CLAUDE-project.md -> CLAUDE.md in current working directory
install_claude_md "$SCRIPT_DIR/claude/CLAUDE-project.md" "$(pwd)/CLAUDE.md" "Installing project-level CLAUDE.md -> $(pwd)/CLAUDE.md" "project-level-instructions"

# 3. Install notification hook if audio file exists
if [[ -f ".claude/notification.mp3" ]]; then
    echo "Installing notification hook for .claude/notification.mp3"
    if command -v bun &> /dev/null; then
        if bun run "$SCRIPT_DIR/typescript/scripts/install-hooks.ts" \
            "Notification" "*" \
            "ffplay -nodisp -autoexit -loglevel quiet ./.claude/notification.mp3 < /dev/null" \
            --project --timeout=5; then
            echo "Notification hook installed successfully"
        else
            echo "Warning: Failed to install notification hook"
        fi
    else
        echo "Warning: bun not found, skipping notification hook installation"
        echo "Install bun to enable hook installation: https://bun.sh"
    fi
else
    echo "No .claude/notification.mp3 found, skipping notification hook installation"
fi


echo "Installing code-formatter hook with rins_hooks"
rins_hooks install code-formatter --project


print_installation_footer "project-level"