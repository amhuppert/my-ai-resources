# TypeScript Standards

## Type Safety

- Never use `any`; use `unknown` for truly unknown types
- Never use `@ts-ignore` or `@ts-expect-error` unless explicitly directed
- Minimize type assertions (`as` keyword); prefer runtime validation
- Use optional chaining (`?.`) and nullish coalescing (`??`), not `||`
- Fix type errors properly; if unable, stop and ask for help

## Conventions

- Use plain functions over classes unless explicitly directed
- Use factory functions returning plain objects instead of class instances
- Use Zod for runtime validation of external data
- Use discriminated unions with literal `type` field for variant types
- Use nominal types for IDs and semantic strings (e.g., `WithFlavor<string, "UserID">`)

## Testing

- Run tests: `bun test` (or `AGENT=1 bun test` for AI-friendly output)
- Co-locate unit tests: `lib/foo.ts` → `lib/foo.test.ts`
- Use real APIs for pure functions; mock only external dependencies when necessary
