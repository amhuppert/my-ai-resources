#!/usr/bin/env bash

# Install AI tooling user-level config and scripts
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common helper functions
source "$SCRIPT_DIR/lib/helpers.sh"

print_installation_header "user-level" "$SCRIPT_DIR"

# 1. agent-docs -> ~/.claude/agent-docs
install_directory "$SCRIPT_DIR/agent-docs" "$HOME/.claude/agent-docs" "Syncing agent-docs -> ~/.claude/agent-docs"

# 2. claude/commands/ -> ~/.claude/commands
install_directory "$SCRIPT_DIR/claude/commands" "$HOME/.claude/commands" "Syncing claude/commands -> ~/.claude/commands"

# 3. scripts/lgit -> ~/.local/bin/lgit
install_file "$SCRIPT_DIR/scripts/lgit" "$HOME/.local/bin/lgit" "Installing lgit -> ~/.local/bin/lgit" "true"

# 4. Install Claude Code settings using TypeScript installer
echo "Installing Claude Code user-level settings..."
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

# 5. Install MCP servers for Claude Code
echo "Adding Context7 MCP server"
claude mcp add --transport http context7 https://mcp.context7.com/mcp

# 6. Install Hooks
echo "Installing Hooks"

echo "Installing rins_hooks"
bun install -g rins_hooks

echo "Installing notifications hook with rins_hooks"
rins_hooks install notification

echo "Installing code formatter hook with rins_hooks"
rins_hooks install code-formatter

print_installation_footer "user-level"