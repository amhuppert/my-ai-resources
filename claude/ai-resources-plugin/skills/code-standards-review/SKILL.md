---
name: code-standards-review
description: Use this skill when reviewing a codebase for adherence to code standards. This skill performs comprehensive standards audits using specialized agents with progressive disclosure to determine which standards apply to the specific codebase. Examples:

<example>
Context: User has a React TypeScript project they want to audit
user: "Review my codebase for code standards violations"
assistant: "I'll use the code-standards-review skill to audit your entire codebase against project standards."
<commentary>
Direct request for code standards review makes this skill appropriate.
</commentary>
</example>

<example>
Context: User wants to review only a specific directory
user: "Check my /src/features directory for standards compliance"
assistant: "I'll use the code-standards-review skill to review the /src/features scope against applicable standards."
<commentary>
Scoped review request indicates this skill should analyze a specific directory.
</commentary>
</example>

<example>
Context: User is setting up a new project and wants standards guidance
user: "Audit my new React app for any code standards issues"
assistant: "I'll launch the code-standards-review skill to perform a comprehensive audit with findings and recommendations."
<commentary>
New project audit is a clear use case for this skill.
</commentary>
</example>

---

# Code Standards Review Skill

## Overview

This skill provides comprehensive code standards audits using specialized agents. It automatically determines which code standards apply to your codebase and launches focused review agents only for applicable standards, reporting findings in a user-friendly format with recommendations.

**The skill provides:**

- Scope control (entire project or specific directory)
- Automatic detection of applicable standards
- Parallel agent-based reviews
- Summary-first reporting with user review/approval phase
- Detailed findings organized by standard

## How It Works

### Phase 1: Scope Analysis

When invoked, the skill first determines:

- **Scope**: Entire project (default) or user-specified directory via optional argument
- **Technology Stack**: Detected file types (TypeScript, React, Zustand, etc.)
- **Applicable Standards**: Which standards apply based on detected technologies

### Phase 2: Progressive Disclosure

The skill uses progressive disclosure to launch only relevant agents:

**Detected Automatically:**

**All Codebases:**

- **General Standards Reviewer** - Always runs (code quality, comments, error handling, YAGNI)

**TypeScript Projects:**

- **TypeScript Type Safety Reviewer** - Validates or identifies type safety issues
- **Zustand Reviewer** - Validates existing stores OR identifies where Zustand should be used (prescriptive pattern)
- **Dependency Injection Reviewer** - Validates existing DI OR identifies where DI should be introduced (prescriptive pattern)

**React Projects:**

- **Colocation Reviewer** - Organization and file structure (any codebase type)
- **TanStack Query Reviewer** - Validates existing queries OR identifies where TanStack Query should be used (prescriptive pattern)

The system scans for file types and project characteristics to determine relevance. The Zustand, Dependency Injection, and TanStack Query reviewers run on applicable projects even if those patterns aren't currently used, identifying opportunities for best-practice adoption.

### Phase 3: Parallel Reviews

When applicable standards are determined, specialized agents are launched in parallel:

- **General Standards Reviewer** - Code quality, control flow, comments, error handling, YAGNI
- **Colocation Reviewer** - Organization and file structure
- **TypeScript Type Safety Reviewer** - Type safety standards
- **Zustand Reviewer** - State management best practices (validates existing or identifies where to use)
- **Dependency Injection Reviewer** - Service layer and DI patterns (validates existing or identifies where to use)
- **TanStack Query Reviewer** - Data fetching patterns (validates existing or identifies where to use)

Each agent provides prescriptive guidance:

- Reviews existing implementations against best practices
- Identifies opportunities for improvement or adoption of preferred patterns
- Provides specific recommendations with rationale

Each finding includes:

- Specific file paths and line numbers
- Current vs. recommended patterns
- Rationale and severity levels
- Implementation guidance

### Phase 4: Summary Report

Findings are aggregated into a summary report showing:

- **Standards Overview**: Which standards were checked
- **Critical Issues**: Most important violations requiring immediate attention
- **High Priority Issues**: Important issues to address
- **Medium Priority Issues**: Good-to-have improvements
- **Agent-specific Findings**: Detailed results from each reviewer

### Phase 5: User Review & Action Planning

The user is presented with findings and asked:

1. Which issues should be addressed?
2. What priority order for fixes?
3. Request for approval to generate detailed recommendations

## Usage

### Basic Usage (Entire Project)

```
To audit your entire project against code standards, invoke the skill with:

"Review my codebase for code standards"
or
"Audit my project for standards violations"
```

### Scoped Usage (Specific Directory)

```
To audit a specific directory, include the path:

"Review my /src/features directory for standards"
or
"Audit /src/components for code standards violations"
or
"Check the /app/products scope against standards"
```

### Outcome

The skill produces:

1. **Summary Report** - Overview of findings by severity
2. **Detailed Findings** - Per-agent results with specific recommendations
3. **Action Plan** - Prioritized list of changes to make
4. **Implementation Guide** - Specific steps to fix each category of issue

## Standards Covered

### Always Reviewed (All Codebases)

- **General Code Standards** - Control flow, comments, error handling, YAGNI principle

### TypeScript Projects

- **TypeScript** - Type safety and strict typing (prescriptive: identifies unsafe patterns)
- **Zustand** - State management best practices (prescriptive: identifies where to use or improve)
- **Dependency Injection** - Service layer and context patterns (prescriptive: identifies where to use or improve)

### React Projects

- **Colocation** - File organization and structural patterns (any architecture)
- **TanStack Query** - Query key factories and caching patterns (prescriptive: identifies where to use or improve)

Each standard has comprehensive reference documentation available in the skill's `references/` directory for detailed guidance. The Zustand, Dependency Injection, and TanStack Query agents are **prescriptive reviewers** that identify both violations of existing implementations AND opportunities to adopt these preferred patterns even if not currently used.

## Standards Referenced

- `@references/colocation-standards.md` - Code organization principles
- `@references/general-code-standards.md` - Quality and design principles
- `@references/zustand-reference.md` - State management best practices
- `@references/dependency-injection.md` - Service layer patterns
- `@references/typescript-general.md` - Type safety standards
- `@references/tanstack-query-key-factory-reference.md` - Query pattern best practices

## Key Features

### Progressive Disclosure

Only launches agents for standards applicable to detected technologies. A vanilla JavaScript project won't get Zustand or TypeScript reviews.

### Parallel Execution

Multiple agents work simultaneously, dramatically reducing review time while maintaining quality.

### Severity-Based Prioritization

Findings are categorized as Critical (must fix), High (important), or Medium (nice-to-have), helping you prioritize effort.

### User Review Phase

Before implementation, you're shown summary findings and asked which issues to address, ensuring you're aligned with recommendations.

### Detailed Reporting

Each finding includes:

- File path and line number
- Current pattern vs. recommended pattern
- Rationale for the recommendation
- Implementation effort estimate

The skill provides everything needed for a comprehensive standards audit and actionable recommendations for improvement.
