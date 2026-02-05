# PROMPT.md Template for Ralph

This template provides the structure and annotations for creating effective Ralph PROMPT.md files.

## Template

```markdown
# Ralph Development Instructions

## Context

<!-- 1-2 sentences describing what is being built and its purpose -->

You are Ralph, building [DESCRIPTION].

## Technology Stack

<!-- List all technologies with specific versions. Include:
     - Primary language and version
     - Framework(s) and version(s)
     - Key libraries for core functionality
     - Testing framework
     - Build tools if relevant -->

- [Language] [version]
- [Framework] [version]
- [Library] [version] - [purpose]

## Key Principles

<!-- 3-7 actionable principles that Claude can verify. Focus on:
     - Code organization patterns
     - Error handling approach
     - Performance considerations
     - Security requirements
     - Style/convention requirements -->

- [Principle 1]
- [Principle 2]

## Current Objectives

<!-- Numbered list of specific, measurable goals for this phase.
     Each objective should be independently verifiable as complete. -->

1. [Objective 1]
2. [Objective 2]

## Data Entities / API Contracts

<!-- Define the core data structures with:
     - Field names and types
     - Constraints (max length, required, unique)
     - Relationships between entities
     - For APIs: endpoint paths, methods, request/response shapes -->

### [Entity Name]

- field_name: type (constraints)
- field_name: type (constraints)

## Quality Standards

<!-- Specific, measurable quality requirements:
     - Test coverage thresholds
     - Documentation requirements
     - Performance benchmarks
     - Code review criteria -->

- [Standard 1]
- [Standard 2]
```

## Best Practices

### Be Specific

- BAD: "Use modern JavaScript"
- GOOD: "Use TypeScript 5.3 with strict mode enabled"

### Include Versions

- BAD: "Use React"
- GOOD: "Use React 18.2 with functional components and hooks"

### Make Principles Verifiable

- BAD: "Write clean code"
- GOOD: "Functions should have a single responsibility and be under 50 lines"

### Define Data Structures Completely

- BAD: "Store user information"
- GOOD: "User: id (uuid, primary key), email (string, unique, max 255), created_at (timestamp)"

### Set Measurable Quality Standards

- BAD: "Test the code"
- GOOD: "Maintain 80% test coverage with unit tests for all business logic"

## Project Type Examples

### CLI Tool

```markdown
## Context

You are Ralph, building a command-line tool for converting CSV files to JSON format.

## Technology Stack

- Node.js 20 LTS
- Commander.js 11 for CLI parsing
- csv-parse 5.5 for CSV processing
- Vitest 1.0 for testing

## Key Principles

- Support stdin/stdout for unix pipeline compatibility
- Provide clear error messages with line numbers for parsing failures
- Use streaming for memory efficiency with large files
```

### Web API

```markdown
## Context

You are Ralph, building a REST API for managing a personal expense tracker.

## Technology Stack

- Python 3.12
- FastAPI 0.109
- SQLAlchemy 2.0 with async support
- PostgreSQL 16
- Pydantic 2.5 for validation
- pytest-asyncio for testing

## Key Principles

- Use async/await for all I/O operations
- Implement proper pagination for list endpoints
- Return RFC 7807 problem details for errors
- Use dependency injection for testability
```

### Frontend App

```markdown
## Context

You are Ralph, building a React dashboard for monitoring server health metrics.

## Technology Stack

- React 18.2 with TypeScript 5.3
- Vite 5.0 for bundling
- TanStack Query 5.0 for data fetching
- Tailwind CSS 3.4 for styling
- Vitest + Testing Library for tests

## Key Principles

- Use functional components with hooks exclusively
- Implement loading and error states for all data fetching
- Ensure all interactive elements are keyboard accessible
- Keep components under 200 lines; extract logic to custom hooks
```
