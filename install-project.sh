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

print_installation_footer "project-level"