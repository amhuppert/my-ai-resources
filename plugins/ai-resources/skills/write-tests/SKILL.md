---
name: write-tests
description: Write automated tests or decide whether code earns one. Covers
  mocking strategy (inject a test double before jest.mock), behavioral
  assertions, and code that resists testing.
---

# Write tests

A good test breaks when behavior is wrong, not when internals change.

## 1. Decide what earns a test

Write tests for business logic and domain rules, edge cases that have caused or could cause bugs, system integration points, complex branching, and critical regression paths.

Skip pass-through functions with no logic, framework behavior already tested upstream, static config, and fragile details likely to shift (exact CSS classes, specific log wording).

Keep a candidate only if a failure in that test would signal a real bug rather than a harmless refactor.

## 2. Name the contract

Every function, component, or service has a **contract**: arguments and return values, props and rendered output, observable side effects (API calls made, events emitted), and error behavior. Internal state, private helpers, internal call order, imports, and intermediate shapes stay outside it.

Every planned assertion must observe the code solely through its contract.

## 3. Pick a mocking rung per dependency

Use the highest rung that fits (where `jest.mock` refers to Jest or your test runner's module-mocking API):

1. **No mock.** Pure functions and deterministic logic: pass real inputs and assert outputs.
2. **Injected test double.** Production code accepts the dependency through a **seam** (constructor/function parameter, factory argument, React context); the test supplies a plain object matching the interface (with `jest.fn()` methods where helpful) through that seam. This is ordinary dependency injection, not module mocking.
3. **`jest.mock` on a third-party module.** For libraries with side effects no seam controls: filesystem, native modules, global singletons, network, timers, browser APIs in Node. Keep the real library whenever it is pure, fast, and deterministic. Wrap the side effect in a thin adapter taken through a seam so `jest.mock` stays isolated to the adapter's test file.
4. **`jest.mock` on an own module.** Acceptable pragmatically when it meaningfully simplifies tests and the suite still exercises real logic. The price is coupling: the mock encodes how the module is called internally, so it breaks on refactors and can drift from production. Keep it shallow; if the mock starts re-implementing the module it replaces, add a seam instead.

### When no seam exists

Hard-coded dependencies and direct imports of internal services leave no seam for rung 2. Introduce a seam (parameter, factory argument, context entry, thin adapter, or extracting pure logic) when a module mock would duplicate real logic or leave the test verifying only plumbing; otherwise rung 4 is acceptable. If adding a seam requires refactoring beyond the current task, flag the design issue and suggest incremental seams rather than cementing a mock-heavy suite.

Every dependency under test should map to an explicit rung, and for every own-module `jest.mock`, you should be able to point to the non-trivial logic still exercised.

## 4. Write behavioral assertions and run the confidence test

Phrase every assertion as "when X happens, Y results": return value, rendered output, state change, or contract-level side effect. Assert call order only when sequence itself is part of the contract (such as ordered events).

Run the **confidence test** on each test: if replacing the production code with `return mockValue` would still let the test pass, it tests the mock rather than the code. Watch for three failure shapes:

- **Mock echo:** mock returns `X`, test asserts `X`.
- **Interaction-only:** assertions check only mock call arguments with no observable outcome.
- **Mock-driven:** changing the mock's return value is the only way to change the test outcome.

Rewrite any failing test to assert a real transformation (filtering, combining, validating, mapping) or delete it.

## Reference notes

- **Unit vs. integration:** prefer an integration test when real dependencies are cheap (in-memory DB, pure libraries, light services); one solid integration test often beats a dozen mocked unit tests. Drop to a unit test to localize failures, avoid slow/flaky dependencies, or exercise dense internal logic directly.
- **React components:** query rendered output by user-facing semantics (role, label, text) with Testing Library. Assert visible UI and observable outcomes (callbacks invoked, calls through injected mock services). Ignore hooks called, child components rendered, and CSS classes or inline styles unless styling is the behavior under test.
- **Error paths:** error behavior belongs to the contract. Trigger it with real failure inputs (rejected injected double, bad arguments, simulated client error). Assert the error type or contract outcome; assert exact message strings only when callers or users depend on them.
