#!/bin/bash
set -euo pipefail

input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name // ""')
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

if [[ "$tool_name" != "Write" && "$tool_name" != "Edit" && "$tool_name" != "MultiEdit" ]]; then
  exit 0
fi

if [[ ! "$file_path" =~ \.(test|spec)\.[a-zA-Z]{1,5}$ ]]; then
  exit 0
fi

cat <<'EOF'
{
  "systemMessage": "You are about to write or edit a test file. If you have not already done so in this session, invoke the write-tests skill (Skill tool with skill name 'ai-resources:write-tests') to load the project's testing standards. Key reminders: prefer injected test doubles over jest.mock on internal modules; assert behavior (outputs, state, side effects), not implementation details; apply the confidence test — if replacing the production code with 'return mockValue' wouldn't break the test, the test is exercising the mock rather than the code."
}
EOF
