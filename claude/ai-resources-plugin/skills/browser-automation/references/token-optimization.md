# Token Optimization for Browser Automation

## Token Cost Baseline

| Source | Approximate Cost |
|--------|-----------------|
| MCP tool definitions (core 22 tools) | ~3,400 tokens per message |
| Accessibility snapshot (typical page) | ~3,800 tokens |
| Screenshot (typical page) | ~10,000+ tokens |
| Full MCP automation session | ~114,000 tokens |
| Equivalent CLI session | ~27,000 tokens |

The primary cost driver is **context accumulation**: MCP streams snapshots inline after every action, and all previous snapshots remain in the conversation history.

## Configuration-Level Optimizations

### 1. Snapshot Mode: Incremental (Default)

`--snapshot-mode incremental` sends only diffs after the first snapshot. This is the default and should not be changed unless debugging snapshot issues.

### 2. Omit Image Responses

`--image-responses omit` prevents screenshots from being included in responses. Use when snapshots (accessibility tree) are sufficient and visual verification is not needed.

### 3. Disable Codegen

`--codegen none` prevents Playwright from generating test code alongside actions. Use when test code generation is not needed.

### 4. Headless Mode

`--headless` reduces resource consumption on Linux/CI. No direct token savings but improves performance.

### 5. Disconnect When Idle

MCP tool definitions load on every message (~3,400 tokens) whether tools are used or not. Toggle the Playwright MCP off with `/mcp` in Claude Code when browser automation is not actively needed.

### 6. Limit Capability Groups

Only enable `--caps` flags needed for the task:

```bash
# Minimal: core tools only (default)
npx @playwright/mcp@latest --headless

# With testing verification
npx @playwright/mcp@latest --headless --caps=testing

# Avoid enabling everything
# BAD: --caps=vision,pdf,devtools,testing,network,storage,config
```

Each capability group adds tool definitions that consume tokens on every message.

## Prompt-Level Optimizations

### Be Maximally Specific

Vague prompts cause exploratory navigation that wastes tokens:

```
# Bad: vague, requires exploration
"Test the login page"

# Good: specific, reduces back-and-forth
"Navigate to http://localhost:3000/login, fill email with 'test@example.com'
and password with 'pass123', click Sign In, verify 'Dashboard' heading appears"
```

### Provide Selectors and URLs Upfront

Include `data-testid` values, element descriptions, and URLs in the initial prompt:

```
"Navigate to /settings. The theme toggle has data-testid='theme-toggle'.
Click it and verify the body class changes to 'dark-mode'."
```

### Minimize Navigation Steps

Each page load triggers a snapshot. Plan interaction sequences to minimize page transitions:

```
# Bad: navigate to each page separately
Navigate to /users → snapshot → navigate to /users/1 → snapshot → navigate to /users/1/edit → snapshot

# Good: go directly to the target
Navigate to /users/1/edit → snapshot → interact
```

### Batch Form Interactions

Use `browser_fill_form` (MCP) to fill multiple fields in one call instead of separate `browser_type` calls. Each tool call incurs snapshot overhead.

## Workflow-Level Optimizations

### Manual Auth + Automation

For headed browsers, authenticate manually before starting automation. Auth flows consume 5-10 tool calls (navigate to login, fill email, fill password, click submit, wait for redirect) that are pure overhead.

### Save and Restore Auth State

After authenticating once, save the state:

**MCP:**
```
browser_storage_state → path: "auth.json"    # save
browser_set_storage_state → path: "auth.json" # restore in future session
```

**CLI:**
```bash
playwright-cli state-save auth.json           # save
playwright-cli state-load auth.json           # restore
```

**MCP config flag:**
```bash
npx @playwright/mcp@latest --storage-state auth.json   # auto-restore on startup
```

### Use JavaScript Evaluation for Data Extraction

Instead of navigating and snapshotting multiple pages to gather data, use `browser_evaluate` (MCP) or `eval` (CLI) to extract data directly:

```
# Instead of navigating to 5 pages to count items:
browser_evaluate → expression: "document.querySelectorAll('.item').length"
```

### Use CLI for Long Sessions

For sessions exceeding ~20 interactions, switch to `playwright-cli`. Snapshots save to disk as YAML files instead of accumulating in the conversation window.

Token accumulation comparison at 20 steps:
- **MCP**: ~60,000-80,000 tokens of stale snapshot data in context
- **CLI**: ~0 tokens of stale data (snapshots on disk, read only when needed)

## Architecture-Level Decision: MCP vs CLI

### When MCP is Cost-Effective

- Short sessions (<20 steps)
- Exploratory work where inspecting page state inline is valuable
- When the user needs to see snapshots in the conversation
- Quick visual verification (navigate + screenshot)

### When CLI is Cost-Effective

- Long automation sessions (20+ steps)
- Token budget is constrained
- Parallel browser sessions needed
- Combining browser automation with large codebase context

### Hybrid Approach

Start with MCP for exploration and understanding, switch to CLI for repetitive execution:

1. Use MCP to explore the app and understand page structures
2. Use CLI for the actual multi-step automation workflow
3. Use MCP for final verification screenshots

## Secrets Management

Use the `--secrets` flag to prevent sensitive data from appearing in LLM context:

```bash
# .env.playwright
LOGIN_EMAIL=admin@example.com
LOGIN_PASSWORD=secret123

npx @playwright/mcp@latest --secrets .env.playwright
```

The MCP server masks secret values in snapshots and responses, reducing the risk of credentials appearing in conversation history.
