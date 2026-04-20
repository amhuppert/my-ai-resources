---
name: write-tests
description: This skill should be used when the user asks to "write tests", "add tests", "create unit tests", "test this function", "test this component", "add test coverage", or wants to write automated tests for code. Guides test selection, mocking strategy, and writing tests that verify behavior rather than implementation details.
---

# Write Tests

Write automated tests that provide real confidence in production code behavior with minimal maintenance burden. Focus on behavioral assertions, proper dependency injection, and avoiding over-mocking.

## Core Principle

Tests exist to provide confidence that production code works correctly. Evaluate every testing decision through this lens: does this test increase real confidence, or does it create maintenance burden without meaningful coverage?

A good test:

- Asserts observable behavior (return values, state changes, side effects)
- Exercises real production code paths
- Survives refactoring of implementation details
- Would catch a real regression if the code broke

A bad test:

- Mirrors the implementation line-by-line
- Only verifies that mocks were configured correctly
- Breaks when internal helpers are renamed or refactored
- Asserts trivial details (exact CSS classes, specific log messages)

## Workflow for Writing a Test

### Step 1: Decide Whether the Code Warrants a Test

Not every piece of code needs a test. Before writing, weigh value against maintenance cost.

**Write tests for:**

- Business logic and domain rules
- Edge cases that have caused or could cause bugs
- Integration points between systems
- Complex conditional flows
- Critical regression paths

**Skip or minimize tests for:**

- Simple pass-through functions with no logic
- Framework behavior already tested by the framework
- Static configuration values
- Trivial implementation details likely to change (exact CSS classes, specific styles, specific log messages)
- Code that mirrors the implementation line-by-line without testing behavior

**Evaluation criteria:**

- Would this test catch a real bug? If the test breaks, does it indicate a genuine problem or just a refactor?
- Does the test survive reasonable refactoring? Tests coupled to implementation details break on every change, creating noise without catching bugs.
- Is the test testing behavior or structure? Behavior tests ("when X happens, Y results") are durable. Structure tests ("function calls A then B") are fragile.

### Step 2: Identify the Public Contract

Every function, component, or service has a public contract: its props, arguments, return values, and whatever details consumers need to know. Tests should only interact through that public contract.

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

Tests that rely on implementation detail knowledge break when the implementation is refactored, not when something is actually wrong. This is maintenance burden without added confidence.

**Connection to mocking:** `jest.mock` module replacement inherently requires the test to know about implementation details. To set up the mock correctly, the test author must understand how the mocked module is used internally — what it returns, when it's called, what shape the data takes. This couples the test to internals, making it brittle and divergent from production behavior.

### Step 3: Choose the Mocking Strategy

Follow the mocking hierarchy — prefer options higher in the list, avoid lower ones.

1. **No mock** — Pure functions, deterministic logic. Pass real inputs, assert outputs.
2. **Injected dependency** — Accept the dependency as a parameter, factory argument, or via context. In the test, provide a plain test double (mock data object, `jest.fn()`, mock service satisfying the interface).
3. **Third-party module mock (`jest.mock`)** — Use only when a library performs side effects that cannot be controlled through injection (file system, native modules, global singletons, network, timers, browser APIs in Node).
4. **Mocking own modules with `jest.mock`** — Almost always a design smell. If internal code needs to be replaced, the code likely lacks proper DI.

**What counts as a legitimate test double (fine, not "mocking"):**

- Mock data objects passed as props or arguments
- `jest.fn()` passed as a parameter or through context
- Mock service objects implementing an interface, injected via context

**What counts as problematic mocking:**

- `jest.mock('./internal/service')` replacing an entire internal module
- `jest.mock` configured so the test never runs the real production code path
- Mock setup that requires knowledge of how the module is used internally
- Mock setup that duplicates the implementation logic it replaces

**Signs that `jest.mock` is covering for missing DI:**

- Mocking an own service module to test a component → the component should receive the service via injection
- Mocking a utility function to isolate a unit → the utility should be a parameter, or the test should be an integration test
- Mocking data access layers inline → a service abstraction is missing
- Any mock that requires understanding internal implementation details of the mocked module

**Prefer the real library when:**

- The library is pure or nearly pure (no network, no file system, no timers)
- Testing the integration between application code and the library provides meaningful confidence
- The library is fast and deterministic enough to run in tests

Even when `jest.mock` on a third-party library is warranted, prefer wrapping the side-effecting code in a thin adapter that can be injected. Confine `jest.mock` to the adapter's own test file rather than spreading it across the codebase.

When the production code supports DI, test setup looks like:

```typescript
const mockUserService: UserService = {
  getUser: jest.fn().mockResolvedValue(testUser),
  updateUser: jest.fn().mockResolvedValue(updatedUser),
  deleteUser: jest.fn(),
};

render(
  <ServiceContext.Provider value={{ userService: mockUserService }}>
    <ComponentUnderTest />
  </ServiceContext.Provider>
);
```

No `jest.mock` calls. No module patching. The mock is a plain object satisfying an interface.

If the production code does not yet support injection and would require `jest.mock` on own modules, flag this as a testability problem before writing the test. Recommend refactoring toward injection rather than adding brittle mocks.

### Step 4: Write Behavioral Assertions

Every assertion should express "when X happens, Y results." Avoid "function calls A then B" unless the call sequence is itself part of the public contract (e.g., verifying an event was emitted).

**Behavioral (durable):**

```typescript
const result = calculateDiscount({ total: 100, memberTier: "gold" });
expect(result).toBe(85);
```

**Structural (fragile):**

```typescript
calculateDiscount({ total: 100, memberTier: "gold" });
expect(internalLookupTable.get).toHaveBeenCalledWith("gold");
expect(applyDiscount).toHaveBeenCalledBefore(formatResult);
```

For components, assert on rendered output and observable effects, not on which internal hook was called or which child component received which prop.

**What good tests look like:**

- **Meaningful transformation** — The production code transforms, filters, combines, or validates data. The test verifies the transformation, not the plumbing.
- **Behavioral assertions** — Test asserts observable outcomes (return values, state changes, side effects) rather than internal call sequences.
- **Minimal module mocking** — `jest.mock` is reserved for third-party side effects. Injected test doubles (mock data, `jest.fn()` passed as parameters, mock objects via context) handle everything else.
- **Integration over isolation** — When the cost of real dependencies is low (in-memory databases, lightweight services), integration tests beat heavily-mocked unit tests.

### Step 5: Apply the Confidence Test

Aggressive mocking can create the illusion of strong test coverage while providing minimal real confidence. When a test mocks most dependencies and then asserts the result, it may only verify that:

- The mock was configured correctly
- The code calls the mock in the expected order
- The mock returns what it was told to return

None of these assertions prove the production code works.

Before finalizing the test, ask: **"If I replaced the production code with a function that just returns the mock's value directly, would this test still pass?"**

If yes, the test is exercising the mock, not the code. Rewrite it to cover meaningful transformation, or delete it.

**Anti-patterns to watch for:**

- **Mock echo** — Mock is set up to return X, test asserts result is X, production code is just a pass-through being verified.
- **Interaction-only** — Test only verifies that mocked functions were called with certain arguments, without asserting any meaningful output or state change.
- **Mock configuration** — Changing the mock's return value is the only way to change the test outcome, meaning the production code path is irrelevant.

**Over-mocking indicators:**

- `jest.mock()` calls on internal/own modules (even one is a smell)
- Changing an implementation detail (not behavior) breaks multiple test files
- Mock setup duplicates the implementation logic it replaces
- Tests pass with mocks but production code fails — the mocks diverged from reality

## Common Decisions

### Unit Test vs. Integration Test

Prefer integration tests when dependencies are cheap (in-memory databases, pure libraries, lightweight services). A single integration test often provides more confidence than a dozen heavily-mocked unit tests.

Drop to unit tests when:

- Isolating the unit makes the failure mode easier to localize
- Real dependencies are expensive or non-deterministic
- The unit has complex internal logic worth exercising in isolation

### Testing React Components

- Query rendered output using Testing Library queries based on user-facing semantics (role, label, text)
- Assert observable effects (callbacks invoked, API calls made via injected mock services)
- Avoid asserting internal state, which hooks were called, or which child components rendered by internal name
- Avoid asserting exact CSS classes or inline styles unless the style is the behavior being tested

### Testing Error Paths

Error handling is part of the public contract. Exercise error conditions using real error inputs — throwing errors from injected test doubles, invalid arguments, or simulated failures through injected clients. Avoid asserting exact error message strings unless the message is part of the contract.

## If the Code Is Not Testable

When writing a test exposes a testability problem (hard-coded dependencies, no injection point, tight coupling to a global), stop and raise the design issue before adding brittle mocks. A `jest.mock`-heavy test locks in the bad design and makes future refactoring harder.

Recommend one of:

- Add a dependency injection point (constructor parameter, factory argument, React context)
- Extract a thin adapter around the side-effecting code
- Split the unit so the pure logic can be tested directly

For legacy code without DI, recommend incremental refactoring toward an injectable architecture rather than papering over with mocks.

## Checklist Before Finalizing a Test

- [ ] The test provides real confidence that production code works
- [ ] Assertions target behavior (outputs, state, observable effects), not implementation (call order, internal structure)
- [ ] `jest.mock` is only used for third-party side effects, never internal modules
- [ ] Test doubles are provided through the same injection mechanism used in production
- [ ] The test would catch a real regression, not only break on harmless refactors
- [ ] The confidence test passes: replacing production code with `return mockValue` would cause this test to fail
