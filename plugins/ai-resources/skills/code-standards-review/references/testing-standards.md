# Testing standards

Tests earn their keep by catching bugs when behavior breaks while surviving refactors of internals. Review every test through that tradeoff: does it add real confidence, or does it add maintenance drag?

When writing new tests from scratch, see also the `write-tests` skill.

## Test value vs. maintenance cost

**Worth testing:** business logic and domain rules, bug-prone edge cases, integration boundaries, complex branching, and critical regression paths.

**Low-value (flag for deletion or rewrite):** pass-through wrappers with no logic, framework behavior already tested upstream, static config values, and brittle implementation checks (exact CSS classes, log strings, private helper call order).

## Contract vs. implementation details

Test only through a unit's public contract: arguments and return values, component props and rendered user-facing output, observable side effects (API calls, emitted events), and error paths.

Flag assertions tied to internal state variables, helper functions, internal call sequences (unless call order is itself the contract), import structure, or intermediate shapes.

## Mocking hierarchy

Prefer the highest level that fits:

1. **No mock:** pure functions and deterministic logic tested with real inputs.
2. **Injected test double:** pass mock data, `jest.fn()`, or a plain object satisfying a service interface through a parameter or React context (ordinary DI, not module mocking).
3. **Third-party module mock (`jest.mock`):** acceptable for side-effecting external libraries that cannot be injected (`fs`, `child_process`, native modules, network, timers, browser APIs in Node). Prefer the real library when it is pure, fast, and deterministic. Wrap side effects in a thin injectable adapter so `jest.mock` stays isolated to the adapter's own test file.
4. **Own-module mock (`jest.mock` on internal code):** acceptable only as a pragmatic tradeoff when it keeps the mock shallow and the test still exercises substantial logic.

### When an own-module `jest.mock` is a finding

Flag an own-module `jest.mock` when any of these apply (otherwise treat it as an accepted tradeoff, at most a brief note):

- An injection point already exists (parameter or service context) and the test mocks the module anyway.
- The mock reproduces the real module's logic.
- With the mock in place, the test fails the confidence test below.

Recommend the concrete seam the mock is substituting for: a function parameter, a service provided via context, or a thin adapter around the side effect.

## Confidence test and mock-heavy smells

Ask of every test: "If I replaced the production code with a stub returning the mock's value directly, would this test still pass?" If yes, the test checks the mock rather than production code.

Common failure shapes to flag:

- **Mock echo:** mock returns `X`, test asserts `X`, production code is just pass-through plumbing.
- **Interaction-only:** assertions check only what mocked functions were called with, never an observable output or state change.
- **Mock-driven:** changing the mock's return value is the only way to change the test outcome.
- **Over-mocked isolation:** mocking cheap, deterministic collaborators (in-memory stores, pure helpers) where one integration test would buy far more confidence.

## Relationship to dependency injection

When services are injected through a typed React context (see [`dependency-injection.md`](dependency-injection.md)), tests pass plain objects satisfying the service interface instead of patching modules with `jest.mock`:

```tsx
const mockUserService: UserService = {
  getUser: jest.fn().mockResolvedValue(testUser),
  updateUser: jest.fn().mockResolvedValue(updatedUser),
  deleteUser: jest.fn(),
};

render(
  <ServiceContext.Provider value={{ userService: mockUserService, ...otherServices }}>
    <ComponentUnderTest />
  </ServiceContext.Provider>,
);
```

## Review checklist

- Each test verifies real behavior that could regress, not trivia or internals.
- Assertions check contract-level outcomes (outputs, rendered UI, errors, observable side effects).
- Every own-module `jest.mock` is justified: no bypassed seam, shallow setup, and real logic still exercised.
- Every test fails if the code under test is gutted (passes the confidence test).
