# Zustand standards

Zustand stores are React hooks with subscription-based rendering (no root provider needed). Use them strictly for client state shared across 2 or more components.

## Enforced rules

1. **Zustand vs. `useState` boundary:** use `useState` for state owned by a single component (form inputs, local toggles). Use Zustand only when 2+ components share client state. (Server state belongs in TanStack Query, not Zustand.)
2. **Multiple small stores:** create one focused store per concern (`auth.store.ts`, `modal.store.ts`), never a single monolithic store. Colocate `{feature}.store.ts` with its feature.
3. **Never export the raw store:** keep `useXStore` private to its file and export custom selector and action hooks instead, even for single-value stores. This prevents accidental whole-store subscriptions (`useXStore()`).
4. **Event-driven actions (no generic setters):** name actions after what happened (`submitForm`, `toggleModal`, `clearErrors`, `resetForm`), not `setX`/`updateX`/`changeX`. Colocate mutation logic inside the action so callers do not coordinate multi-field updates.
5. **Always use Immer middleware:** wrap every store initializer with `immer((set) => ...)` so nested updates stay concise and immutable.
6. **Stable selectors only:** Zustand compares selector outputs with `===`. Select primitives or pass `shallow` for flat objects; never run `.filter()`, `.map()`, or return fresh objects inside a selector. Compute derived values in custom hooks (with `useMemo` if expensive) instead of storing computed state.
7. **No cross-store reads:** do not let Store A read Store B directly. Compose hooks from both stores in components or pass required values as action parameters.

## Standard store pattern

```ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface FormValues {
  email: string;
  name: string;
}

interface FormStore {
  values: FormValues;
  errors: Record<string, string>;
  isSubmitting: boolean;
  submitForm: (data: FormValues) => void;
  resetForm: () => void;
}

const useFormStore = create<FormStore>()(
  immer((set) => ({
    values: { email: "", name: "" },
    errors: {},
    isSubmitting: false,
    submitForm: (data) =>
      set((state) => {
        state.values = data;
        state.isSubmitting = true;
        state.errors = {};
      }),
    resetForm: () =>
      set((state) => {
        state.values = { email: "", name: "" };
        state.errors = {};
        state.isSubmitting = false;
      }),
  })),
);

export const useFormValues = () => useFormStore((s) => s.values);
export const useIsSubmitting = () => useFormStore((s) => s.isSubmitting);
export const useSubmitForm = () => useFormStore((s) => s.submitForm);
export const useResetForm = () => useFormStore((s) => s.resetForm);
```

## Async actions, reset, and testing

- **Async actions:** use `async/await` directly inside store actions (no thunk middleware). If an in-flight request can outlive a component unmount, track an `AbortController` and abort it in cleanup.
- **Store reset:** expose a named reset action or call `useStore.setState(useStore.getInitialState())`.
- **Unit testing stores without React:** invoke actions and inspect state via `useStore.getState()`, and reset state in `beforeEach`.
- **Persistence:** chain `persist(immer((set) => ...), { name: "store-key" })` when state must survive reloads.

## What to flag in review

- Raw `use*Store` exported or imported directly in components.
- Setter-named actions (`setCount`, `setIsOpen`, `updateField`) instead of domain events.
- Stores created without `immer` middleware, or manual deep-spread mutations.
- Selectors returning new arrays/objects per call (`.filter()`, `{ a: s.a, b: s.b }` without `shallow`).
- Derived/computed values stored in state where they can drift.
- Single-component local state placed in Zustand, or server data duplicated in Zustand instead of TanStack Query.
