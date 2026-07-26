---
name: write-tests
description: "Write automated tests. Guides test selection, mocking strategy, and writing tests that verify behavior over implementation."
---

# Write Tests

Tests exist to provide confidence that production code works correctly. Evaluate every testing decision through that lens: does this test increase real confidence, or does it create maintenance burden without meaningful coverage? A good test asserts observable behavior, exercises real production code paths, and would catch a real regression — it breaks when something is actually wrong, not when internals are refactored.

## Step 1: Decide Whether the Code Warrants a Test

Not every piece of code needs a test — weigh value against maintenance cost.

Write tests for:

- Business logic and domain rules
- Edge cases that have caused or could cause bugs
- Integration points between systems
- Complex conditional flows
- Critical regression paths

Skip or minimize tests for:

- Simple pass-through functions with no logic
- Framework behavior already tested by the framework
- Static configuration values
- Trivial details likely to change (exact CSS classes, specific styles, specific log messages)

The deciding question: if this test breaks, does that indicate a genuine problem or just a refactor? Behavior tests ("when X happens, Y results") are durable. Structure tests ("function calls A then B") break on every internal change, creating noise without catching bugs.

## Step 2: Identify the Public Contract

Every function, component, or service has a public contract: its props, arguments, return values, and whatever consumers need to know. Tests should interact only through that contract — tests that rely on implementation knowledge break when the code is refactored, not when it is wrong.

Test (the contract):

- Function arguments and return values
- Component props and rendered output
- Observable side effects (API calls made, events emitted)
- Error conditions and edge case handling

Don't test (implementation details):

- Internal state variables or helper functions
- The order internal methods are called
- Which internal modules a component imports
- How data is structured internally before being returned

## Step 3: Choose the Mocking Strategy

Follow this hierarchy — prefer options higher in the list:

1. **No mock** — Pure functions, deterministic logic. Pass real inputs, assert outputs.
2. **Injected dependency** — Accept the dependency as a parameter, factory argument, or via context; provide a plain test double in the test.
3. **Third-party module mock (`jest.mock`)** — Only when a library performs side effects that cannot be controlled through injection (file system, native modules, global singletons, network, timers, browser APIs in Node). Prefer the real library when it is pure, fast, and deterministic. Even when a mock is warranted, wrap the side-effecting code in a thin injectable adapter and confine `jest.mock` to the adapter's own test file.
4. **`jest.mock` on your own modules** — Don't. See below.

### Don't mock your own modules

`jest.mock` on an internal module couples the test to implementation details: configuring the mock requires knowing how the module is used internally — what it returns, when it is called, what shape the data takes. The resulting test verifies the mock, not the production code: it proves only that the mock was configured correctly and returns what it was told to return. Warning signs:

- Any `jest.mock()` call on an own module — even one indicates the code lacks an injection point
- Mock setup that duplicates the implementation logic it replaces
- Changing the mock's return value is the only way to change the test outcome
- Tests pass but production code fails — the mocks diverged from reality
- Changing an implementation detail (not behavior) breaks multiple test files

If a test would require mocking an own module, that is a design problem in the production code, not a testing problem — see "If the Code Is Not Testable" below.

Injected test doubles are fine and are not mocking in this problematic sense:

- Mock data objects passed as props or arguments
- `jest.fn()` passed as a parameter or through context
- Mock service objects implementing an interface, injected via context

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

No `jest.mock` calls, no module patching — the mock is a plain object satisfying an interface.

## Step 4: Write Behavioral Assertions

Every assertion should express "when X happens, Y results" — not "function calls A then B", unless the call sequence is itself part of the public contract (e.g., verifying an event was emitted).

Behavioral (durable):

```typescript
const result = calculateDiscount({ total: 100, memberTier: "gold" });
expect(result).toBe(85);
```

Structural (fragile):

```typescript
calculateDiscount({ total: 100, memberTier: "gold" });
expect(internalLookupTable.get).toHaveBeenCalledWith("gold");
expect(applyDiscount).toHaveBeenCalledBefore(formatResult);
```

For components, assert on rendered output and observable effects, not on which internal hook was called or which child component received which prop.

## Step 5: Apply the Confidence Test

Before finalizing, ask: if the production code were replaced with a function that just returns the mock's value directly, would this test still pass? If yes, the test exercises the mock, not the code — typical forms are the mock echo (mock returns X, test asserts X) and interaction-only tests (assertions solely about what mocked functions were called with). Rewrite the test to verify a meaningful transformation — the production code transforms, filters, combines, or validates data and the test checks that result — or delete it.

## Common Decisions

### Unit Test vs. Integration Test

Prefer integration tests when dependencies are cheap (in-memory databases, pure libraries, lightweight services) — a single integration test often provides more confidence than a dozen heavily-mocked unit tests. Drop to unit tests when:

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

When writing a test exposes a testability problem (hard-coded dependencies, no injection point, tight coupling to a global), stop and raise the design issue before adding brittle mocks — a `jest.mock`-heavy test locks in the bad design and makes future refactoring harder. Recommend one of:

- Add a dependency injection point (constructor parameter, factory argument, React context)
- Extract a thin adapter around the side-effecting code
- Split the unit so the pure logic can be tested directly

For legacy code without DI, recommend incremental refactoring toward an injectable architecture rather than papering over with mocks.
