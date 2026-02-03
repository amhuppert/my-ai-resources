# Design Agents Configuration

This file configures project-specific agents for the `/design` workflow.

## Configuration

Optional settings for the design workflow:

- design-system-file: [path to design system spec, e.g., docs/design-system.md]
- requirements-file: [path to requirements, defaults to memory-bank/*requirements*.md]

## Research Agents

Domain experts that gather information during Phase 2 (before design synthesis).
These agents run in parallel to research specific aspects of the problem domain.

Add entries as: `- agent-name: Brief description of expertise`

Example:

- domain-expert-agent: Researches [specific domain] best practices and patterns

## Review Agents

Additional reviewers beyond the universal agents that run during Phase 4.
These agents evaluate the design draft for project-specific concerns.

Add entries as: `- agent-name: Brief description of what it reviews`

Example:

- security-review-agent: Reviews for authentication, authorization, and data protection
