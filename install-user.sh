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

# 3. claude/CLAUDE-user.md -> ~/.claude/CLAUDE.md
install_claude_md "$SCRIPT_DIR/claude/CLAUDE-user.md" "$HOME/.claude/CLAUDE.md" "Installing claude/CLAUDE-user.md -> ~/.claude/CLAUDE.md"

# 4. Install scripts
install_file "$SCRIPT_DIR/scripts/lgit" "$HOME/.local/bin/lgit" "Installing lgit -> ~/.local/bin/lgit" "true"
install_file "$SCRIPT_DIR/scripts/code-tree" "$HOME/.local/bin/code-tree" "Installing code-tree -> ~/.local/bin/code-tree" "true"
install_file "$SCRIPT_DIR/scripts/read-file" "$HOME/.local/bin/read-file" "Installing read-file -> ~/.local/bin/read-file" "true"
install_file "$SCRIPT_DIR/scripts/push-main" "$HOME/.local/bin/push-main" "Installing push-main -> ~/.local/bin/push-main" "true"

# 5. Install Claude Code settings using TypeScript installer
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

# 6. Install MCP servers for Claude Code
echo "Adding Context7 MCP server"
claude mcp add --transport sse context7 https://mcp.context7.com/sse --scope user

# 7. Install Hooks
echo "Installing Hooks"

echo "Installing rins_hooks from fork"
# Clone the rins_hooks fork if it doesn't exist
if [ ! -d "$HOME/rins_hooks" ]; then
    echo "Cloning rins_hooks fork..."
    git clone https://github.com/amhuppert/rins_hooks.git "$HOME/rins_hooks"
else
    echo "rins_hooks fork already exists, updating..."
    cd "$HOME/rins_hooks"
    git pull
    cd - > /dev/null
fi

# Install globally with bun link
echo "Installing rins_hooks globally with bun link..."
cd "$HOME/rins_hooks"
bun install
bun link
cd - > /dev/null

print_installation_footer "user-level"