# Skill mechanics

Use this reference when choosing skill frontmatter, invocation policy, or skill boundaries. The [main skill](../SKILL.md) owns the writing guidance.

## Invocation and discovery

Choose how the skill should be reached, accounting for the host's actual discovery rules:

- **Model-invoked:** a concise description exposes the skill's purpose and distinct trigger cases. This spends always-loaded context for autonomous discovery and still permits explicit user invocation. Prefer this when the agent or another workflow needs to find the skill independently.
- **User-invoked:** explicit invocation places discovery responsibility on the human. Use it when the user should choose the workflow and automatic activation is unwanted. Write the description as a human-facing summary rather than a trigger catalogue. This can reduce model context load where the host omits such skills from discovery.

In Claude Code, `disable-model-invocation: true` selects explicit invocation; omit it for ordinary model discovery. In Codex, `agents/openai.yaml` can set `policy.allow_implicit_invocation: false`. Preserve the user's chosen mode; otherwise keep normal automatic discovery for a new skill.

Use required `name` and `description` frontmatter, with a name matching the skill directory. Confirm supported fields and invocation behavior for the target host rather than assuming all clients use the same mechanics.

## Shared reference and splits

Keep shared writing guidance in one authoritative location. A model-discoverable reference skill can serve several workflows when the host supports that usage. A plain reference file with explicit pointers is appropriate when consumers need the same material without invoking another workflow, including when the relevant skills are explicit-only.

Split into a separate model-invoked skill when it has a distinct useful trigger or another workflow needs independent discovery. A new name and description spend context load; a new explicit-only skill spends human cognitive load. A recognizable term helps routing only if it denotes a real independent use case.

When explicit-only skills become hard to remember, a router can provide one entry point that names them and explains when each applies. Distinguish recommending a skill from invoking it: a pointer or router does not grant permission to bypass the host's explicit-invocation policy. Where downstream invocation requires the user, the router should present the appropriate choice.
