# TypeScript Standards

### Type Safety

- NEVER use `@ts-ignore` or `@ts-expect-error` unless explicitly directed
- NEVER use `any`
- Use `unknown` for truly unknown types
- Always fix type errors properly (NEVER bypass the type checker)
- If unable to fix type error, stop and ask for help
- Minimize the use of type assertions (`as` keyword)
- Use optional chaining (`?.`) and nullish coalescing (`??`) when appropriate (not `||`)

### Conventions

- Use plain functions over classes, unless explicitly directed to use a class
