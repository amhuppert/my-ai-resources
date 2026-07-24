---
name: add-design-agent
description: "Create a research or review agent for the /design workflow."
disable-model-invocation: true
argument-hint: "[research|review] [agent-name]"
allowed-tools: Read, Write, Edit, AskUserQuestion
---

Create a new project-specific design agent that integrates with the `/design` workflow.

## Arguments

- Agent type (optional) - "research" or "review"
  - **research**: Domain expert that gathers information during Phase 2 (before design synthesis)
  - **review**: Evaluator that reviews designs during Phase 4 (after synthesis)
- Agent name (optional) - Name for the agent (will be suffixed with `-agent`)

Extract both values from the user's invocation input.

## Process

### Step 1: Determine Agent Type

If the agent type is missing or is not "research" or "review", ask the user with
the active client's user-question mechanism:

- Question: "What type of design agent do you want to create?"
- Options:
  - "Research Agent" - Gathers domain-specific information before design synthesis
  - "Review Agent" - Evaluates designs for specific concerns after synthesis

### Step 2: Get Agent Details

Use the active client's user-question mechanism to gather:

**Question 1: Agent Name**

- "What should this agent be called? (will be suffixed with -agent)"
- If an agent name was provided, skip this question and use it

**Question 2: Domain/Expertise**

- "What is this agent's area of expertise?"
- Example answers: "security", "accessibility", "performance", "domain X best practices"

**Question 3: Key Responsibilities**

- "What are the main things this agent should analyze? (Select all that apply or describe)"
- Options will vary based on type:
  - Research: "Best practices", "Industry standards", "Implementation patterns", "Tradeoffs"
  - Review: "Security issues", "Performance concerns", "Compliance", "Best practices adherence"

### Step 3: Create the Agent

Create the agent directly using the active client's custom-agent format. If a
dedicated agent-development skill is available, use it.

Provide this context to the skill:

````
Create a design workflow agent with these specifications:

**Type**: [research|review]
**Name**: [agent-name]-agent
**Domain**: [user's expertise description]
**Responsibilities**: [user's selected/described responsibilities]

**Requirements**:
1. Frontmatter must include:
   - name: [agent-name]-agent
   - description: Use this agent when [appropriate triggering conditions based on type and domain]
   - model: sonnet
   - color: [choose appropriate color - not already used by universal agents: magenta, gray, blue, red, cyan, yellow, orange]
   - tools: Read, Grep, Glob, Write [add WebSearch, WebFetch if research agent]

2. System prompt must include:
   - Clear role description as [research expert | reviewer] in [domain]
   - Core responsibilities (3-5 items based on user input)
   - Process/methodology for [researching | reviewing]
   - Output format following design workflow conventions:

     For RESEARCH agents:
     ```markdown
     # [Agent Name] Research

     ## Executive Summary
     [2-3 sentences on key findings]

     ## Key Findings
     ### [Finding 1]
     - Observation
     - Implications
     - Recommendation

     ## Recommendations
     [Prioritized list]

     ## Tradeoffs and Alternatives
     [Options considered, why recommendations chosen]

     ## References
     [Sources consulted]
     ```

     For REVIEW agents:
     ```markdown
     # [Agent Name] Review

     ## Summary
     [1-2 sentence assessment]

     ## Critical Issues
     ### [Issue 1]
     - Location: [where]
     - Problem: [what]
     - Impact: [why it matters]
     - Recommendation: [how to fix]

     ## Major Issues
     [Same format]

     ## Minor Issues
     [Same format]

     ## Suggestions
     [Nice-to-haves]

     ## What's Working Well
     [Positive aspects]
     ```

3. Save the agent in the active client's project agent directory:
   - Claude Code: `.claude/agents/[agent-name]-agent.md`
   - Codex: `.codex/agents/[agent-name]-agent.toml`
````

### Step 4: Save the Agent

Save the generated agent file to the active client's path above. Create the
parent directory if it doesn't exist.

### Step 5: Update DESIGN-AGENTS.md

Check if `memory-bank/DESIGN-AGENTS.md` exists.

**If it doesn't exist:**

1. Create it using `references/design-agents-template.md`
2. Add the new agent to the appropriate section

**If it exists:**

1. Read the current content
2. Find the appropriate section:
   - For research agents: "## Research Agents"
   - For review agents: "## Review Agents"
3. Add a new entry: `- [agent-name]-agent: [brief description of expertise]`

### Step 6: Confirm Creation

Report to the user:

```markdown
## Design Agent Created

**Agent**: [agent-name]-agent
**Type**: [Research|Review]
**Location**: [the active client's project agent path]
**Added to**: memory-bank/DESIGN-AGENTS.md

### Next Steps

1. Review the agent at its reported location
2. Customize the system prompt if needed
3. Run `/design` to use the new agent in your design workflow

The agent will automatically be included in:

- [If research]: Phase 2 (Research) of new design workflows
- [If review]: Phase 4 (Review) of both new design and iteration workflows
```

## Error Handling

- If the active client's project agent directory cannot be created, report the error and suggest manual creation
- If DESIGN-AGENTS.md update fails, provide the entry to add manually
- If agent name conflicts with existing agent, ask for a different name
