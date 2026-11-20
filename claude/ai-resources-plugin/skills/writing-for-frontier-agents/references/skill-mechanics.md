# Skill mechanics

Read this when setting skill frontmatter, choosing invocation policy, or deciding whether to split a skill. Core writing rules live in [`../SKILL.md`](../SKILL.md).

## Invocation and discovery

Pick how the skill is triggered based on the host's actual discovery behavior:

- **Model-invoked:** write a concise description naming the skill's purpose and distinct trigger cases. This spends always-loaded context on every turn for autonomous discovery while still allowing manual invocation. Use it when the agent or another workflow should find the skill on its own.
- **User-invoked:** place discovery on the human when explicit choice is wanted and automatic triggering is not. Write the description as a plain human summary rather than a trigger catalogue. Where the host hides explicit-only skills from model discovery, this also saves context load.

In Claude Code, `disable-model-invocation: true` selects explicit-only invocation; omitting it allows model discovery. In Codex, `agents/openai.yaml` sets `policy.allow_implicit_invocation: false`. Keep a skill's existing invocation mode unless asked to change it; default to automatic discovery for new skills.

Always include required `name` and `description` frontmatter with `name` matching the skill directory. Check supported frontmatter fields and discovery rules for the target host instead of assuming clients match.

## Shared references and splitting

Keep shared guidance in one authoritative place. A model-discoverable reference skill can serve multiple workflows where the host supports cross-skill invocation. A plain reference file with explicit links fits better when callers only need the content without triggering another workflow, or when consuming skills are explicit-only.

Split out a separate model-invoked skill only when it has a distinct trigger or another workflow needs independent discovery. Every new model-invoked skill adds always-loaded context; every new explicit-only skill adds something for humans to remember. A separate name helps routing only when it represents a genuinely separate use case.

If explicit-only skills multiply and get hard to remember, add a single router that lists them and states when each applies. Recommending a skill is not the same as invoking it: a pointer or router never overrides explicit-only policy. When the downstream skill requires human invocation, present the choice to the user.
