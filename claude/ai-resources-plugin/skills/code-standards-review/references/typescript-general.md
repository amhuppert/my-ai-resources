# TypeScript standards

## Type safety

- Do not use `any`. Use `unknown` for truly unknown values and narrow them before use.
- Do not bypass the type checker with `@ts-ignore` or `@ts-expect-error` unless the user explicitly directs it. Fix the underlying type error; if blocked, stop and ask.
- Minimize type assertions (`as`); prefer type guards, generics, or schema parsing (`Zod`).
- Use optional chaining (`?.`) and nullish coalescing (`??`) rather than `||` when `0`, `""`, or `false` are valid values.

## Conventions

- Prefer plain functions and factory functions over classes unless a class is explicitly requested or required by a framework API.
