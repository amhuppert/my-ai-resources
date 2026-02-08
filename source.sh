# Source this file to add project aliases
# Usage: source /path/to/my-ai-resources/source.sh

_AIR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# TypeScript tools (ai CLI, json-to-schema)
alias air-ai-build="(cd '$_AIR_ROOT/typescript' && bun run build)"

# Voice-to-text
alias air-voice-install="(cd '$_AIR_ROOT/voice-to-text' && bun run build && bun run install-tool)"
alias air-voice-test="(cd '$_AIR_ROOT/voice-to-text' && bun run test)"
