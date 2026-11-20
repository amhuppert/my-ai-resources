# Dependency injection pattern

Decouple React components and hooks from concrete API implementations by injecting typed services through a single React context. Components never import service implementations or call `fetch` directly; they go through TanStack Query hooks (or custom hooks) that pull services from context.

## Layering

```text
Components (call query/custom hooks only)
  -> TanStack Query / custom hooks (read service from context)
    -> Service interfaces (TypeScript contracts)
      -> Service factory implementations (HTTP calls + Zod validation)
        -> External APIs
```

## 1. Service interface and factory

Define a TypeScript interface for the service contract, then implement it with a factory function (not a class, per [`typescript-general.md`](typescript-general.md)). Parse every external response with Zod immediately upon receipt so invalid payloads throw at the boundary instead of leaking downstream.

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export interface UserService {
  getUser(id: string): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

export function createUserService(): UserService {
  return {
    async getUser(id) {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return UserSchema.parse(await response.json());
    },

    async updateUser(id, data) {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return UserSchema.parse(await response.json());
    },

    async deleteUser(id) {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete user");
    },
  };
}
```

## 2. Unified service context

Expose all services from one root `ServiceContext` and export a dedicated hook per service. Memoize the `services` object inside `ServiceProvider` so re-renders of the root provider do not recreate service instances.

```tsx
import React, { useMemo } from "react";

export interface Services {
  userService: UserService;
  productService: ProductService;
  analyticsService?: AnalyticsService; // optional services check before returning
}

export const ServiceContext = React.createContext<Services | undefined>(undefined);

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo<Services>(
    () => ({
      userService: createUserService(),
      productService: createProductService(),
    }),
    [],
  );

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useUserService(): UserService {
  const services = React.useContext(ServiceContext);
  if (!services) {
    throw new Error("useUserService must be used inside ServiceProvider");
  }
  return services.userService;
}
```

For optional services (`analyticsService?`), check `if (!services?.analyticsService)` in the hook and throw a clear error when missing.

## 3. TanStack Query integration

Place TanStack Query hooks between components and services so caching, deduplication, and error state stay out of both components and raw service factories:

```ts
export function useUserQuery(userId: string) {
  const userService = useUserService();
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getUser(userId),
  });
}
```

Errors thrown by `fetch` or `Zod.parse()` surface automatically in the query hook's `error` state.

## 4. File placement and testing

Colocate each service (`UserService.ts`), its Zod schemas/types, and its query hooks inside its feature directory (`src/features/users/`). Keep `ServiceContext.tsx` centralized at `src/lib/ServiceContext.tsx`, and move a service to `src/lib/services/` only when shared by 2+ features.

In tests, wrap the component in `<ServiceContext.Provider value={mockServices}>` with plain objects satisfying the service interfaces (no `jest.mock` module patching needed).

## What to flag in review

- Components calling `fetch`/axios or importing concrete service implementations directly.
- Service factories returning unvalidated `response.json()` without `Zod.parse()`.
- Services built as classes instead of interface + factory functions.
- Multiple scattered service contexts instead of one unified `ServiceContext` with per-service hooks.
- Recreating service instances on every provider render without memoization.
