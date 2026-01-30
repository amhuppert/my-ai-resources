#!/bin/bash
# Memory Bank SessionStart Hook
# Uses TypeScript script to parse focus.md and outputs system message

set -euo pipefail

# Use the TypeScript script to read frontmatter
result=$(bun run "${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts" "${CLAUDE_PROJECT_DIR}/memory-bank/focus.md" 2>/dev/null || echo '{"found":false}')

# Parse JSON result
found=$(echo "$result" | jq -r '.found')
objective_slug=$(echo "$result" | jq -r '.objective_slug // empty')

# Exit silently if no frontmatter or no objective
if [ "$found" != "true" ] || [ -z "$objective_slug" ]; then
  exit 0
fi

# Get feature slugs as comma-separated list
feature_slugs=$(echo "$result" | jq -r '.feature_slugs | join(", ")' 2>/dev/null || echo "")

# Build system message
message="Memory Bank: Active objective '${objective_slug}' detected."

if [ -n "$feature_slugs" ]; then
  message="${message} Additional features: ${feature_slugs}."
fi

message="${message} Load context with: mcp__memory-bank__build_context({ \"objective_slug\": \"${objective_slug}\" })"

# Output JSON for Claude
cat << EOF
{
  "systemMessage": "$message"
}
EOF
