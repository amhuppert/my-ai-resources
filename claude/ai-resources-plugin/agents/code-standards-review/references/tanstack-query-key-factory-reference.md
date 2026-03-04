# TanStack Query Key Factory Pattern Reference Guide for AI Agents

<Overview>
Query key factories are structured objects that generate consistent, hierarchical query keys for TanStack Query (React Query). They prevent key mismatches, enable targeted cache operations, provide type safety, and improve code maintainability by centralizing key definitions with their related logic.
</Overview>

## Core Concepts

**Query Keys Basics**

- Query keys must be arrays at the top level to enable hierarchical matching
- TanStack Query serializes keys with `JSON.stringify`, so all parts must be JSON-serializable
- Key uniqueness is required; all variables the query depends on must be included in the key
- Object property order doesn't affect key identity (stable stringification)

**Hierarchical Structure**

- Structure keys from _most generic_ to _most specific_: `[entity, category, identifier, filters]`
- Enables partial matching for selective cache operations: invalidate all "todos" while preserving specific details
- Each level should increase granularity: all → lists → lists with filters → detail → detail with ID

**Const Assertions**

- Use `as const` on key definitions to enable TypeScript type inference
- Allows strict typing of key structures and prevents type widening
- Example: `['todos'] as const` vs `['todos']` provides better autocomplete and safety

## Manual Query Key Factory Pattern

**Basic Structure**

```typescript
const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, "detail"] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};
```

**Key Naming Conventions**

- `all`: Root key array for the entity
- `lists()`, `details()`: Category-level keys (returns array, not specific data)
- `list(params)`, `detail(id)`: Specific queries (returns array with parameters)

**Multiple Filters Example**

```typescript
const postsKeys = {
  all: ["posts"] as const,
  lists: () => [...postsKeys.all, "list"] as const,
  list: (filters?: PostFilters) => [...postsKeys.lists(), { filters }] as const,
  details: () => [...postsKeys.all, "detail"] as const,
  detail: (id: string) => [...postsKeys.details(), id] as const,
  search: (query: string) => [...postsKeys.all, "search", { query }] as const,
};
```

## Integration with useQuery

**Hook Implementation**

```typescript
function useTodo(id: number) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
  });
}

function useTodoList(filters?: TodoFilters) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => fetchTodos(filters),
  });
}
```

**Hook Implementation with Query Options Pattern**

```typescript
function useTodoList(filters?: TodoFilters) {
  return useQuery(
    queryOptions({
      queryKey: todoKeys.list(filters),
      queryFn: () => fetchTodos(filters),
      staleTime: 5 * 60 * 1000,
    }),
  );
}
```

## Cache Invalidation Patterns

**Invalidate All Queries for an Entity**

```typescript
const queryClient = useQueryClient();

// Invalidate all todos (lists and details)
queryClient.invalidateQueries({ queryKey: todoKeys.all });
```

**Invalidate Category (e.g., All Lists)**

```typescript
// Invalidate all todo lists, but keep details cached
queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
```

**Invalidate Specific Query**

```typescript
// Invalidate only todo #5
queryClient.invalidateQueries({ queryKey: todoKeys.detail(5) });
```

**Partial Matching with Exact: False**

```typescript
// Invalidate all queries starting with these keys
queryClient.invalidateQueries({
  queryKey: todoKeys.list(),
  exact: false, // Matches todoKeys.list(filters) for any filters
});
```

## Query Options API Pattern

**Define Query Options with Factory**

```typescript
import { queryOptions } from "@tanstack/react-query";

const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters?: TodoFilters) =>
    queryOptions({
      queryKey: [...todoKeys.lists(), { filters }] as const,
      queryFn: () => fetchTodos(filters),
      staleTime: 5 * 60 * 1000,
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoKeys.all, "detail", id] as const,
      queryFn: () => fetchTodo(id),
      staleTime: 10 * 60 * 1000,
    }),
};

function useTodoList(filters?: TodoFilters) {
  return useQuery(todoKeys.list(filters));
}

function useTodo(id: number) {
  return useQuery(todoKeys.detail(id));
}
```

This pattern collocates keys with their query configuration, preventing mismatches.

## Organization Patterns

**Co-located Feature Structure**

```
features/
├── todos/
│   ├── api.ts           // API functions
│   ├── queries.ts       // Query factories and hooks
│   ├── mutations.ts     // Mutation factories
│   └── types.ts         // Type definitions
├── posts/
│   ├── api.ts
│   ├── queries.ts
│   └── types.ts
```

Store query keys in `queries.ts` alongside their related hooks. This improves discoverability and reduces coupling between features.

**Separate Keys vs Hooks**

```typescript
// keys.ts
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters?: TodoFilters) => [...todoKeys.lists(), { filters }] as const,
  detail: (id: number) => [...todoKeys.all, "detail", id] as const,
};

// hooks.ts
import { todoKeys } from "./keys";

export function useTodoList(filters?: TodoFilters) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => api.getTodos(filters),
  });
}

export function useTodo(id: number) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => api.getTodo(id),
  });
}
```

## Common Patterns

**Pagination**

```typescript
const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (page: number, limit: number = 10) =>
    [...postKeys.lists(), { page, limit }] as const,
};

function usePostList(page: number, limit?: number) {
  return useInfiniteQuery({
    queryKey: postKeys.list(page, limit),
    queryFn: ({ pageParam = 1 }) => api.getPosts({ page: pageParam, limit }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}
```

**Filters with Defaults**

```typescript
interface UserFilters {
  role?: "admin" | "user";
  status?: "active" | "inactive";
  search?: string;
}

const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserFilters = {}) => [...userKeys.lists(), filters] as const,
};

// Normalizes filters to enable better caching
function useUserList(filters?: UserFilters) {
  const normalizedFilters = { ...defaultFilters, ...filters };
  return useQuery({
    queryKey: userKeys.list(normalizedFilters),
    queryFn: () => api.getUsers(normalizedFilters),
  });
}
```

**Search Queries**

```typescript
const searchKeys = {
  all: ["search"] as const,
  results: () => [...searchKeys.all, "results"] as const,
  result: (query: string, filters?: SearchFilters) =>
    [...searchKeys.results(), { query, filters }] as const,
};

function useSearch(query: string, filters?: SearchFilters) {
  return useQuery({
    queryKey: searchKeys.result(query, filters),
    queryFn: () => api.search(query, filters),
    enabled: query.length > 2,
  });
}
```

**Related Data**

```typescript
const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (filters?: PostFilters) => [...postKeys.lists(), { filters }] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
  comments: (postId: string) =>
    [...postKeys.detail(postId), "comments"] as const,
};

function usePostComments(postId: string) {
  return useQuery({
    queryKey: postKeys.comments(postId),
    queryFn: () => api.getPostComments(postId),
  });
}
```

## Mutation Integration

**Invalidate on Success**

```typescript
const todoKeys = {
  /* ... */
};

function useTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todo: Todo) => api.updateTodo(todo),
    onSuccess: (updatedTodo) => {
      // Invalidate specific detail
      queryClient.invalidateQueries({
        queryKey: todoKeys.detail(updatedTodo.id),
      });
      // Or invalidate all lists
      queryClient.invalidateQueries({
        queryKey: todoKeys.lists(),
      });
    },
  });
}
```

**Optimistic Updates**

```typescript
function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todo: Todo) => api.updateTodo(todo),
    onMutate: async (newTodo) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: todoKeys.detail(newTodo.id),
      });

      // Snapshot previous data
      const previousTodo = queryClient.getQueryData(
        todoKeys.detail(newTodo.id),
      );

      // Update cache immediately
      queryClient.setQueryData(todoKeys.detail(newTodo.id), newTodo);

      return { previousTodo };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(
        todoKeys.detail(newTodo.id),
        context.previousTodo,
      );
    },
  });
}
```

## Type Safety Best Practices

**Ensure Type Consistency**

```typescript
// Good: Type-safe factory with explicit typing
const todoKeys = {
  all: ["todos"] as const,
  detail: (id: number) => [...todoKeys.all, "detail", id] as const,
};

const id: number = 5;
useQuery({ queryKey: todoKeys.detail(id) }); // ✓ Type-safe

// Avoid: Losing type information
const todoKeys = {
  all: ["todos"],
  detail: (id: any) => [...todoKeys.all, "detail", id],
};
```

**TypeScript Inference with as const**

```typescript
// With as const: Infers literal types
const key = ["todos", "detail", 5] as const;
// Type: readonly ['todos', 'detail', 5]

// Without as const: Infers general types
const key = ["todos", "detail", 5];
// Type: (string | number)[]

// Type narrowing in invalidation
queryClient.invalidateQueries({
  queryKey: todoKeys.detail(5), // Matches exact type
  exact: true,
});
```

## Gotchas and Anti-patterns

**❌ Avoid: Inconsistent Key Structure**

```typescript
// Different queries use different key structures
useQuery({ queryKey: ["todos", "list", filters] });
useQuery({ queryKey: todoKeys.list(filters) });
// Mixing manual and factory keys causes cache misses
```

**✓ Good: Consistent Structure via Factory**

```typescript
// All queries use the same factory
useQuery({ queryKey: todoKeys.list(filters) });
useQuery({ queryKey: todoKeys.detail(id) });
// Guaranteed consistency
```

**❌ Avoid: Objects with Variable Property Order**

```typescript
// Problematic: Property order may vary
const filter1 = { status: "done", priority: "high" };
const filter2 = { priority: "high", status: "done" };
todoKeys.list(filter1); // Different key than filter2
```

**✓ Good: Normalize Filters Before Creating Keys**

```typescript
function normalizeFilters(filters: TodoFilters) {
  return {
    status: filters.status,
    priority: filters.priority,
  };
}

const normalized1 = normalizeFilters(filter1);
const normalized2 = normalizeFilters(filter2);
todoKeys.list(normalized1) === todoKeys.list(normalized2);
```

**❌ Avoid: Sensitive Data in Keys**

```typescript
// Passwords and tokens may be logged
todoKeys.auth(password); // Don't do this
```

**✓ Good: Use ID or Session References**

```typescript
// Use identifiers instead of sensitive values
todoKeys.userSession(userId, sessionId);
```

**❌ Avoid: Dynamic Key Structure**

```typescript
// Structure changes based on conditions
const key = condition ? [...todoKeys.all, "special"] : todoKeys.all;
useQuery({ queryKey: key }); // Unpredictable caching
```

**✓ Good: Fixed Structure with Conditional Logic**

```typescript
// Structure is fixed; conditionals are in query functions
useQuery({
  queryKey: todoKeys.list(filters),
  queryFn: () => (condition ? apiFn1() : apiFn2()),
});
```

**❌ Avoid: Non-Serializable Objects (Set, Map, Functions, Classes)**

```typescript
// Sets and Maps are not JSON.stringify serializable
const todoKeys = {
  all: ["todos"] as const,
  list: (ids: Set<number>) => [...todoKeys.all, "list", ids] as const,
};

// JSON.stringify(ids) becomes {} regardless of Set contents
// Different sets will have the same serialized key, breaking caching
useQuery({ queryKey: todoKeys.list(new Set([1, 2, 3])) });
useQuery({ queryKey: todoKeys.list(new Set([4, 5, 6])) }); // Same cache!
```

**✓ Good: Extract Serializable Primitives** (Recommended)

```typescript
// Convert non-serializable objects to primitives
const todoKeys = {
  all: ["todos"] as const,
  list: (ids: number[]) => [...todoKeys.all, "list", ids] as const,
};

// Use array instead of Set
useQuery({ queryKey: todoKeys.list([1, 2, 3]) });
useQuery({ queryKey: todoKeys.list([4, 5, 6]) }); // Different cache ✓

// Or use a sorted array for Set-like data
const todosByIds = (idSet: Set<number>) =>
  [...todoKeys.all, "list", Array.from(idSet).sort()] as const;
```

## Troubleshooting

**Query Not Updating After Mutation**

- Verify mutation calls `invalidateQueries` with correct key
- Check key structure matches between mutation and query hooks
- Use `console.log(queryClient.getQueryData(key))` to inspect cache

**Cache Misses with Filters**

- Ensure filter objects have consistent property ordering
- Normalize filters before passing to factory functions
- Verify all query-affecting variables are in the key

**Type Errors with as const**

- Ensure `as const` is at the end of the entire key definition
- Don't use `as const` on nested functions without spreading array
- Factory functions must return arrays, not individual strings

**Partial Invalidation Not Working**

- Verify `exact: false` is set for prefix matching
- Check that prefixes match the intended key structure
- Use `queryClient.getQueriesData()` to debug active keys

## References and Resources

- [Effective React Query Keys | TkDodo's Blog](https://tkdodo.eu/blog/effective-react-query-keys)
- [Query Keys | TanStack Query Docs](https://tanstack.com/query/v5/docs/react/guides/query-keys)
- [The Query Options API | TkDodo's Blog](https://tkdodo.eu/blog/the-query-options-api)
