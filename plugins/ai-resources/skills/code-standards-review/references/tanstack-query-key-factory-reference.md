# TanStack Query key factory standards

Centralize TanStack Query keys in typed, hierarchical factory objects colocated with their feature's queries (`features/<name>/queries.ts` or `keys.ts`). This prevents key string drift, enables selective cache invalidation, and keeps query configuration strongly typed.

## Core rules

1. **Always use a factory:** never scatter inline array literals (`["todos", id]`) across hooks and mutations.
2. **Order keys from general to specific:** `[entity, category, identifier/params]` (for example `all -> lists -> list(filters) -> details -> detail(id)`). Hierarchical prefixes let `invalidateQueries` target an entire entity, all lists, or one record.
3. **Mark every key `as const`:** preserves literal tuple types for strict inference and invalidation checking. Never type key parameters as `any`.
4. **Keep key structure fixed and JSON-serializable:** include every variable `queryFn` depends on. Do not pass `Set`, `Map`, functions, or class instances (they serialize to `{}` under JSON serialization and collide in cache). Convert sets to sorted arrays first.
5. **Never put secrets in keys:** keys may appear in devtools and logs; use opaque IDs instead of passwords or tokens.
6. **Avoid conditional key shapes:** keep the key tuple structure fixed and handle conditional branches inside `queryFn` or `enabled`.

Note on filter objects: TanStack Query hashes object keys deterministically (property order does not change cache identity), but explicit `undefined` vs. omitted defaults can still split cache entries. Normalize default filter values before passing them into the key factory.

## Manual factory and `queryOptions` pattern

Basic key factory:

```ts
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters?: TodoFilters) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, "detail"] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
  comments: (id: number) => [...todoKeys.detail(id), "comments"] as const,
};
```

Preferred v5 pattern colocating keys with `queryOptions`:

```ts
import { queryOptions, useQuery } from "@tanstack/react-query";

export const todoQueries = {
  all: ["todos"] as const,
  lists: () => [...todoQueries.all, "list"] as const,
  list: (filters?: TodoFilters) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), { filters }] as const,
      queryFn: () => fetchTodos(filters),
      staleTime: 5 * 60 * 1000,
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.all, "detail", id] as const,
      queryFn: () => fetchTodo(id),
      staleTime: 10 * 60 * 1000,
    }),
};

export function useTodoList(filters?: TodoFilters) {
  return useQuery(todoQueries.list(filters));
}
```

## Invalidation and mutations

Target the exact cache slice affected by a mutation:

```ts
// All todos (lists + details)
queryClient.invalidateQueries({ queryKey: todoKeys.all });

// All lists only (keeps details cached)
queryClient.invalidateQueries({ queryKey: todoKeys.lists() });

// Single item
queryClient.invalidateQueries({ queryKey: todoKeys.detail(updatedTodo.id) });
```

For optimistic updates, cancel outgoing queries for `todoKeys.detail(id)`, snapshot via `getQueryData`, write with `setQueryData`, and restore the snapshot inside `onError`.

## Non-serializable input fix

```ts
// Bad: JSON.stringify(new Set([1, 2])) === "{}" -> cache collision
list: (ids: Set<number>) => [...todoKeys.all, "list", ids] as const,

// Good: convert to a sorted primitive array
list: (ids: Set<number>) =>
  [...todoKeys.all, "list", Array.from(ids).sort((a, b) => a - b)] as const,
```

## What to flag in review

- Inline `queryKey: [...]` arrays duplicated across `useQuery` and `invalidateQueries` calls instead of a key factory.
- Missing `as const` assertions or `any`-typed key parameters.
- Variables used inside `queryFn` omitted from `queryKey`.
- Non-serializable objects (`Set`, `Map`, class instances) or sensitive credentials inside keys.
- Flat, non-hierarchical keys that prevent targeted prefix invalidation.
- Direct `fetch` calls inside components or hooks where TanStack Query should manage server state.
