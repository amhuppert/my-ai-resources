---
name: write-tests
description: Write automated tests, or decide whether code earns one. Covers
  mocking strategy (inject a test double before jest.mock), behavioral
  assertions, and code that resists testing.
---

# Write Tests

A good test breaks when the code is wrong, not when its internals are refactored.

## Step 1: Decide what earns a test

Test business logic and domain rules, edge cases that have caused or could cause bugs, integration points between systems, complex conditional flows, and critical regression paths.

Pass-through functions with no logic, framework behavior the framework already tests, static configuration, and trivial details likely to change (exact CSS classes, specific log messages) earn none.

Done when every candidate passes one question: if this test broke, would it signal a bug rather than a refactor?

## Step 2: Name the contract

Every function, component, or service has a **contract**: its arguments and return values, props and rendered output, observable side effects (API calls made, events emitted), and error conditions. Internal state, helper functions, call order, imports, and intermediate data shapes are outside it.

Done when every assertion you plan reaches the code only through the contract.

## Step 3: Choose a mocking strategy per dependency

Prefer the highest rung that fits:

1. **No mock.** Pure functions and deterministic logic: pass real inputs, assert outputs.
2. **Injected test double.** The production code takes the dependency through a **seam** (constructor parameter, factory argument, React context); the test supplies a plain object satisfying the interface, its methods `jest.fn()`s where useful, through that same seam. This is ordinary dependency injection, not module mocking.
3. **`jest.mock` on a third-party module.** For libraries whose side effects no seam can control: file system, native modules, global singletons, network, timers, browser APIs in Node. Use the real library when it is pure, fast, and deterministic. Wrap the side-effecting call in a thin adapter that the rest of the code takes through a seam, so `jest.mock` stays in the adapter's own test file.
4. **`jest.mock` on an own module.** Acceptable for pragmatic reasons: when it greatly simplifies the tests and the tests still exercise important logic. The cost is coupling. The mock must know how the module is used internally (what it returns, when, in what shape), so the test breaks on refactors and can drift from production. Keep the mock shallow; a mock that reproduces the logic it replaces is the signal to add a seam instead.

### When no seam exists

Hard-coded dependencies and direct imports of own services leave no seam for rung 2. Add one (constructor parameter, factory argument, context entry, a thin adapter around the side effect, or a split that exposes the pure logic) when the mock would otherwise reproduce the module's logic or leave the test verifying only plumbing; otherwise rung 4 is acceptable. When the seam needs a refactor beyond the current task, raise the design issue and recommend incremental refactoring toward seams rather than locking the coupling in with a mock-heavy suite.

Done when every dependency of the code under test has a rung, and for every own-module `jest.mock` you can name the logic the test still exercises.

## Step 4: Write behavioral assertions, then run the confidence test

Every assertion reads "when X happens, Y results": a return value, rendered output, a state change, or a side effect visible through the contract. Assert a call sequence only when the sequence is itself part of the contract, such as an event being emitted.

**Confidence test.** A test passes it when replacing the production code with `return mockValue` would make the test fail. A test that would keep passing verifies the mock, not the code. The usual shapes:

- Mock echo: the mock returns X and the test asserts X.
- Interaction-only: the assertions are solely about what mocked functions were called with.
- Mock-driven: changing the mock's return value is the only way to change the outcome.

Rewrite such a test to check a real transformation (the code filters, combines, validates, or maps data and the test checks that result), or delete it.

Done when every test passes the confidence test.

## Reference

### Unit vs. integration

Prefer an integration test when the dependencies are cheap (in-memory databases, pure libraries, lightweight services): one often buys more confidence than a dozen heavily-mocked unit tests. Drop to a unit test when isolating the unit localizes failures, the real dependency is expensive or non-deterministic, or the unit's internal logic is complex enough to exercise alone.

### React components

Query rendered output by user-facing semantics (role, label, text) with Testing Library. Assert what the user sees and what the component causes: callbacks invoked, API calls made through injected mock services. Hooks called, child components rendered, and CSS classes or inline styles are outside the contract unless the style is the behavior under test.

### Error paths

Error handling is part of the contract. Drive it with real error inputs: a thrown error from an injected double, invalid arguments, a simulated failure through an injected client. Assert the error type or the contract-level outcome; assert the exact message only when the message is part of the contract.
