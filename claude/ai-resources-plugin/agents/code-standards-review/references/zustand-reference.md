# Zustand Reference Guide for AI Agents

<Overview>
Zustand is a lightweight (1.1kB minified+gzipped), unopinionated state management library for React using hooks. It provides simple, performant stores without boilerplate, provider wrapping, or redux-like ceremony.

**Key mental model**: Stores are hooks. Use multiple small stores, never one monolithic store. All state mutations go through named event-actions (not setters). Immer middleware handles nested immutability automatically. Custom hooks are mandatory—even for single-value stores.
</Overview>

## Installation & Setup

```bash
npm install zustand
npm install immer # Required for Immer middleware
```

## File Organization

### File Naming

- Use `{feature}.store.ts` for store files (e.g., `counter.store.ts`, `auth.store.ts`)
- Create only one store per file
- Export the store hook and individual selector hooks from the same file
- Colocate with the feature that uses it (follows colocation principles)

## Core Concepts

### Stores as Hooks

- Zustand `create()` returns a hook, not a Redux-like store object
- Components call the hook to access state and actions
- No Provider or app-level wrapping needed
- Store state is global but subscription-based (only re-renders on selected state changes)

### Multiple Small Stores

- Create separate stores for different concerns (not one monolithic store)
- Example: `useAuthStore`, `useUIStore`, `useModalStore`, `useFormStore`
- Each store focuses on a single piece of domain logic
- Easier to reason about, test, and maintain than Redux-style combined stores

### Custom Hooks (Mandatory Pattern)

- **Never export the raw store**, always wrap in custom hooks
- Even single-value stores get wrapper hooks (future-proofs for growth)
- Custom hooks handle selector logic and expose only what components need
- Prevents accidental subscriptions to entire store (performance killer)

### Actions as Events (Strict Model—No Setters)

- All state mutations flow through named event-action methods
- Actions describe **what happened** (the event), not how to update state
- Examples of correct event names: `toggleModal()`, `incrementCount()`, `submitForm()`, `clearError()`
- Examples of wrong setter names: `setIsOpen()`, `setCount()` (too generic, not event-like)
- Actions are colocated with state in the store definition
- Each action encapsulates its own mutation logic

### Immer Middleware (Always Enabled)

- Simplifies nested object state updates without manual copying
- Without Immer: manually spread/copy entire nested object paths
- With Immer: write mutation-like code on draft state; Immer ensures immutability
- Applied at store creation time with `immer` middleware

### Selector Stability (Critical Performance)

- Zustand detects state changes using strict equality (`===`)
- Selectors must return stable references (same object/value when content unchanged)
- Returning new objects/arrays every time causes unnecessary re-renders
- Keep selectors pure, simple, and focused on extracting data
- Move complex transformations outside selectors (into custom hooks)

### Zustand vs useState Boundary

- **Use Zustand**: State accessed by 2+ components (shared/global state)
- **Use useState**: State used by only 1 component (form inputs, local UI state)
- Clear decision boundary prevents both under-engineering (too much useState) and over-engineering (Zustand for trivial state)

## Store Creation API

### Basic Store with Immer

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface CounterStore {
  count: number;
  incrementCount: () => void;
  decrementCount: () => void;
  resetCount: () => void;
}

const useCounterStore = create<CounterStore>()(
  immer((set) => ({
    count: 0,
    incrementCount: () =>
      set((state) => {
        state.count++;
      }),
    decrementCount: () =>
      set((state) => {
        state.count--;
      }),
    resetCount: () =>
      set((state) => {
        state.count = 0;
      }),
  })),
);
```

### Store Structure

- First parameter to `create()`: The reducer function
- The reducer receives `set` and `get` functions
- `set` merges new state (one level deep without Immer)
- `get` retrieves current state
- Immer middleware wraps the entire store, making all mutations safe

### Middleware Syntax

- Middleware wraps the store initializer: `immer((set) => (...))`
- Can chain multiple middlewares: `immer(devtools((set) => (...)))`
- Immer must be used in all new stores

## Custom Hook Patterns

- Never export the raw store directly
- Export custom hooks for data access and actions
- Example selectors:
  ```typescript
  export const useCount = () => useCounterStore((state) => state.count);
  export const useIncrementCount = () =>
    useCounterStore((state) => state.incrementCount);
  export const useResetCount = () =>
    useCounterStore((state) => state.resetCount);
  ```
- Compose multiple selectors when components always need them together:
  ```typescript
  export const useAuthStatus = () => {
    const user = useAuthStore((state) => state.user);
    const loading = useAuthStore((state) => state.loading);
    return { user, loading };
  };
  ```

## Actions: Event-Driven Pattern

**Naming Convention (Strict):**

- Use imperative verbs describing what happened: `submitForm()`, `toggleModal()`, `clearErrors()`, `incrementCount()`, `resetAuth()`
- **Never use setter names**: Avoid `setX()`, `updateX()`, `changeX()` entirely
- Each action encapsulates its own mutation logic: `submitForm()` handles loading state, error clearing, and data together

**Example action definitions:**

```typescript
const useFormStore = create<FormStore>()(
  immer((set) => ({
    values: {},
    errors: {},
    isSubmitting: false,
    submitForm: (data: any) =>
      set((state) => {
        state.values = data;
        state.isSubmitting = true;
        state.errors = {};
      }),
    resetForm: () =>
      set((state) => {
        state.values = {};
        state.errors = {};
        state.isSubmitting = false;
      }),
  })),
);
```

## Async Actions

Zustand supports async actions natively without middleware like redux-thunk. Use `async/await` directly in store actions:

```typescript
const useUserStore = create<UserStore>()(
  immer((set) => ({
    user: null,
    loading: false,
    error: null,
    fetchUser: async (id: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const data = await fetch(`/api/users/${id}`).then((r) => r.json());
        set((state) => {
          state.user = data;
          state.loading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = (err as Error).message;
          state.loading = false;
        });
      }
    },
  })),
);
```

**For request cleanup on unmount**: Store an `AbortController` in state and cancel in a `useEffect` cleanup function if async operations might complete after unmount.

## Working with Nested State (Immer)

### Without Immer (Manual Immutability—Avoid)

```typescript
// ❌ Without Immer: tedious copying required
set((state) => ({
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      settings: {
        ...state.user.profile.settings,
        theme: "dark",
      },
    },
  },
}));
```

### With Immer (Mutation-like Syntax)

```typescript
set((state) => {
  state.user.profile.settings.theme = "dark";
});
```

## Testing Patterns

**Test stores directly (unit test without React):**

- Call `useCounterStore.getState()` to access current state and call actions
- Test state logic in isolation: `store.incrementCount()` then `expect(store.count).toBe(1)`
- Reset between tests with `useCounterStore.setState({ count: 0 })`

**Test with React components:**

- Use `beforeEach()` to reset store state before each test
- Render components normally; they'll subscribe to store updates
- Verify store state changes trigger expected UI updates

## Common Patterns

**Derived/Computed State:**

- Don't store computed values (they get stale)
- Compute in custom hooks: store only base data, calculate fullName/filtered arrays in hooks with `useMemo` if needed
- Example: Store `firstName` and `lastName`, compute `fullName` in a hook

**State Reset:**

- Create a named action: `resetForm: () => set((state) => { state.values = {}; })`
- Or reset entire store: `useFormStore.setState(useFormStore.getInitialState())`

**Multiple Stores in One Component:**

- Use separate custom hooks for each store; compose them: `const user = useUserStore(...); const theme = useThemeStore(...);`
- No special pattern needed—just use multiple hooks

## Troubleshooting

**Components re-render too often:**

- Selectors must return stable references (same object/array reference when content unchanged)
- Don't filter/map in selectors: `useStore((state) => state.items.filter(...))` creates new array every time
- Instead: extract base data in selector, compute in hook with `useMemo`

**State not persisting on page reload:**

- Use persist middleware: `persist(immer((set) => ...), { name: "store-key" })`

**Nested state updates not working:**

- Without Immer: shallow merge only, nested updates lost
- Always use Immer middleware (enforced in project)

**Async actions triggering memory leak warnings:**

- Store AbortController in state and cancel on unmount in useEffect cleanup
- Or check if component is mounted before calling `set()`

**Circular dependencies between stores:**

- Don't have StoreA directly read from StoreB
- Instead: compose custom hooks from both stores in components
- Or pass needed data as action parameters

## Project Conventions (Enforced)

1. **Always wrap stores in custom hooks** — Never export raw store, even for single-value stores
2. **Strict event model** — All mutations through named event-actions, no generic setters
3. **Always use Immer** — Every store uses Immer middleware for consistency and safety
4. **Clear Zustand/useState boundary** — Zustand for 2+ components, useState for single component
5. **Colocate state and actions** — Store definition file contains both state and its mutations
6. **Keep selectors simple** — Move transformations to custom hooks to maintain selector stability
7. **Use custom hooks for all access** — Components never directly import or use raw store

## Useful Resources

- **GitHub**: [pmndrs/zustand](https://github.com/pmndrs/zustand)
- **Docs**: [Official Zustand Documentation](https://zustand.docs.pmnd.rs/)
- **Blog**: [TkDodo's Zustand Posts](https://tkdodo.eu/blog/working-with-zustand)
- **Comparison**: [Zustand vs Redux vs Context](https://zustand.docs.pmnd.rs/getting-started/comparison)
