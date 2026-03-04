# Testing Standards

## Overview

Tests exist to provide confidence that production code works correctly. Every testing decision should be evaluated through this lens: does this test increase real confidence, or does it create maintenance burden without meaningful coverage?

## Test Value vs. Maintenance Cost

Not every piece of code warrants a test. Balance the confidence a test provides against the cost of maintaining it over time.

**High-value tests:**

- Verify business logic and domain rules
- Cover edge cases that have caused or could cause bugs
- Test integration points between systems
- Validate complex conditional flows
- Protect against regressions in critical paths

**Low-value tests (often not worth maintaining):**

- Assert trivial implementation details likely to change (e.g., exact CSS classes, specific styles, specific log messages)
- Mirror the implementation line-by-line without testing behavior
- Test simple pass-through functions with no logic
- Verify framework behavior that's already tested by the framework
- Assert static configuration values

**Evaluation criteria:**

- Would this test catch a real bug? If the test breaks, does it indicate a genuine problem or just a refactor?
- Does the test survive reasonable refactoring? Tests coupled to implementation details break on every change, creating noise without catching bugs
- Is the test testing behavior or structure? Behavior tests ("when X happens, Y results") are durable. Structure tests ("function calls A then B") are fragile

## Avoid Testing Implementation Details

Every function, component, or service has a public contract: its props, arguments, return values, and whatever details consumers need to know. Tests should only interact through that public contract.

Tests that rely on knowledge of implementation details — internals that should be encapsulated inside the component under test — are a code smell. They break not because something is wrong, but because the implementation was refactored. This is maintenance burden without added confidence.

**Public contract (test this):**

- Function arguments and return values
- Component props and rendered output
- Observable side effects (API calls made, events emitted)
- Error conditions and edge case handling

**Implementation details (don't test this):**

- Internal state variables or helper functions
- The order internal methods are called
- Which internal modules a component imports
- How data is structured internally before being returned

**Connection to mocking:** `jest.mock` module replacement inherently requires the test to know about implementation details. To set up the mock correctly, the test author must understand how the mocked module is used internally — what it returns, when it's called, what shape the data takes. This couples the test to internals, making it brittle and divergent from production behavior.

## Mocking Strategy

### Guiding Principle

Design for proper dependency injection so that tests can substitute dependencies naturally, without requiring special mocking superpowers. The goal: any dependency a unit needs can be provided as a parameter or through a context mechanism, making test doubles trivial to supply.

### Mocking Hierarchy (Prefer Higher, Avoid Lower)

1. **No mock needed** — Pure functions, deterministic logic. Test with real inputs and assert outputs
2. **Injected dependency** — Pass a test double through constructor, factory parameter, or React context. The production code accepts an interface; tests provide a simple object implementing it
3. **Third-party library mock (jest.mock)** — Replace a module's exports when the library performs side effects that cannot be controlled through injection (e.g., file system, network, timers). Acceptable when necessary, but recognize the tradeoff: tested code diverges from production code
4. **Mocking own modules (jest.mock on internal code)** — Almost always a design smell. If internal code needs to be mocked, the architecture likely lacks proper abstraction boundaries or dependency injection

### jest.mock and Third-Party Modules

Having legitimate use cases for `jest.mock` on third-party modules does not mean it's appropriate to mock any third-party module automatically. Third-party code runs in production, and testing that the actual library integrates correctly with application code is often valuable.

**Mock third-party modules when:**

- The library performs side effects that cannot be controlled through injection (e.g., `fs`, `child_process`, native modules, network requests)
- Global singletons provided by frameworks with no injection mechanism
- Environment-specific behavior (e.g., browser APIs in Node test environment)

**Prefer using the real library when:**

- The library is pure or nearly pure (no network requests, no file system, no timers)
- Testing the integration between application code and the library provides meaningful confidence
- The library is fast and deterministic enough to run in tests

Even when jest.mock is warranted, prefer wrapping the side-effecting code in a thin adapter that can be injected, limiting jest.mock to the adapter's test file rather than spreading it across the codebase.

### When jest.mock Is a Smell

- Mocking own service modules to test a component — indicates the component should receive the service via injection
- Mocking utility functions to isolate a unit — indicates the utility should be a parameter or the test should be an integration test
- Mocking data access layers inline — indicates missing service abstraction
- Any mock that requires understanding internal implementation details of the mocked module

### What Counts as Problematic Mocking

The concern is specifically **jest.mock module replacement** — using Jest's power to blow away real production code and substitute entirely different implementations. This is distinct from mock data and injected test doubles, which are fine:

- **Fine**: Creating mock data objects and passing them as props or function arguments
- **Fine**: Using `jest.fn()` and passing it as a parameter or through context (this is just dependency injection)
- **Fine**: Building a mock service object that satisfies an interface and injecting it via context
- **Problematic**: `jest.mock('./myModule')` — replacing an entire module so the test never runs the real code
- **Problematic**: `jest.mock('../services/userService')` — substituting internal service code with fake implementations

### Over-Mocking Indicators

- `jest.mock()` calls on internal/own modules (even one is a smell)
- Changing an implementation detail (not behavior) breaks multiple test files
- Mock setup duplicates the implementation logic it replaces
- Tests pass with mocks but production code fails — the mocks diverged from reality

## Testing Mocks vs. Testing Production Code

Aggressive mocking can create the illusion of strong test coverage while providing minimal real confidence.

### The Problem

When a test mocks most dependencies and then asserts the result, it may only verify that:
- The mock was configured correctly
- The code calls the mock in the expected order
- The mock returns what it was told to return

None of these assertions prove the production code works.

### How to Identify Mock-Heavy Tests

- **Mock echo tests**: Test sets up mock to return X, asserts that the result is X. The production code is just a pass-through being verified
- **Interaction-only tests**: Test only verifies that mocked functions were called with certain arguments, without asserting any meaningful output or state change
- **Mock configuration tests**: Changing the mock's return value is the only way to change the test outcome — the production code path is irrelevant

### What Good Tests Look Like

- **Meaningful transformation**: Production code transforms, filters, combines, or validates data. The test verifies the transformation, not the plumbing
- **Behavioral assertions**: Test asserts observable outcomes (return values, state changes, side effects) rather than internal call sequences
- **Minimal module mocking**: Reserve `jest.mock` for third-party side effects. Use injected test doubles (mock data, `jest.fn()` passed as parameters, mock objects via context) for everything else
- **Integration over isolation**: When the cost of real dependencies is low (in-memory databases, lightweight services), prefer integration tests over heavily-mocked unit tests

### The Confidence Test

For every test, ask: "If I replaced the production code with a function that just returns the mock's value directly, would this test still pass?" If yes, the test is testing the mock, not the code.

## Relationship to Dependency Injection

Proper dependency injection (see `dependency-injection.md`) eliminates most needs for jest.mock:

- Services are injected via React context → tests provide mock service objects directly
- Service interfaces define contracts → mock objects implement the same interface
- No module-level mocking needed → test doubles are just objects passed through the same injection mechanism

When DI is properly implemented, test setup looks like:

```typescript
const mockUserService: UserService = {
  getUser: jest.fn().mockResolvedValue(testUser),
  updateUser: jest.fn().mockResolvedValue(updatedUser),
  deleteUser: jest.fn(),
};

render(
  <ServiceContext.Provider value={{ userService: mockUserService, ...otherServices }}>
    <ComponentUnderTest />
  </ServiceContext.Provider>
);
```

No jest.mock calls. No module patching. The mock is a plain object satisfying an interface.

## Review Checklist

When reviewing tests, evaluate:

- [ ] Does each test provide real confidence that production code works?
- [ ] Are tests asserting behavior (outputs, state) rather than implementation (call order, internal structure)?
- [ ] Is jest.mock used only for third-party side effects, not internal modules?
- [ ] Are own modules injected rather than jest.mock'd?
- [ ] Would the test catch a real regression, or only break on harmless refactors?
- [ ] Do tests survive refactoring of implementation details?
