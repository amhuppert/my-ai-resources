# Dependency Injection Pattern

## Overview

Dependency Injection (DI) decouples service implementations from the code that uses them by providing services from an external source rather than importing them directly. This pattern enables effective testing through mocking, simplifies reasoning about data flow, and isolates API and implementation details within a service layer where they can be changed without affecting the rest of the application.

## Core Concepts

- **Service Interface**: TypeScript interface defining the contract (methods and return types) a service provides
- **Service Implementation**: Concrete implementation of the interface that handles API calls, data transformation, and validation
- **Dependency Injection**: Providing service instances to components through React context rather than direct imports
- **Service Layer**: Centralized abstraction hiding API endpoints, response formats, and low-level details
- **Validation**: Zod schemas parsing and validating all data entering from external services before propagating to the application

## The Pattern

Dependency Injection in React applications follows a layered architecture:

- Components never import service implementations or API details
- Components use injected services through React context via custom hooks
- Services implement interfaces and handle all API communication and data validation
- React context provides the service instance to the entire component tree at application root
- All external data is validated immediately upon receipt through Zod schemas
- TanStack Query hooks sit above services, using services for data fetching and managing request state

**Layer Architecture:**

```
Components (use hooks, never direct service imports)
    ↓
Custom Hooks / TanStack Query Hooks (use services via context)
    ↓
Service Interfaces (abstract contract)
    ↓
Service Implementations (API calls, Zod validation)
    ↓
External APIs / Data Sources
```

## Service Pattern

### Service Interface

Define service interfaces as TypeScript contracts that specify what operations are available. Interfaces hide implementation details and allow mocking in tests:

```typescript
interface UserService {
  getUser(id: string): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}
```

Never use implementations directly. Always depend on interfaces. See [TypeScript Standards](./typescript-general.md) for type safety requirements.

### Service Implementation

Implement interfaces with factory functions that return service objects. Use factory functions (not classes) to align with TypeScript conventions. **Important**: Place `Zod.parse()` immediately after each API call to validate data before using it in the application:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

function createUserService(): UserService {
  return {
    async getUser(id: string): Promise<User> {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return UserSchema.parse(data);
    },

    async updateUser(id: string, data: Partial<User>): Promise<User> {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      const result = await response.json();
      return UserSchema.parse(result);
    },

    async deleteUser(id: string): Promise<void> {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete user");
    },
  };
}
```

**Important**: Zod validation failures throw errors immediately, preventing invalid data from propagating through the application. This makes bugs easier to diagnose.

## Dependency Injection with React Context

Use a single unified React Context to provide all services as an object. Create the context, provider, and individual service hooks in a centralized file:

```typescript
import React from "react";

interface Services {
  userService: UserService;
  productService: ProductService;
}

const ServiceContext = React.createContext<Services | undefined>(undefined);

export function ServiceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const services: Services = {
    userService: createUserService(),
    productService: createProductService(),
  };
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

export function useProductService(): ProductService {
  const services = React.useContext(ServiceContext);
  if (!services) {
    throw new Error("useProductService must be used inside ServiceProvider");
  }
  return services.productService;
}
```

Wrap your application root with the provider:

```typescript
function App() {
  return (
    <ServiceProvider>
      <YourApp />
    </ServiceProvider>
  );
}
```

Components access individual services through specific hooks (`useUserService()`, `useProductService()`), ensuring a single consistent instance of the context.

## Validation with Zod

Validate all data received from external services using Zod schemas. Place validation immediately after API calls within service implementations. This approach:

- Detects API contract violations immediately
- Prevents invalid data from causing bugs in other parts of the application
- Makes debugging easier (errors surface at the boundary, not downstream)

Define Zod schemas in a separate file or with the service:

```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const UserListSchema = z.array(UserSchema);
```

Call `Zod.parse()` on every API response in the service. If validation fails, the error propagates immediately. See [TypeScript Standards](./typescript-general.md) for additional Zod patterns.

## TanStack Query Integration

Position TanStack Query hooks between components and services to manage async state, request deduplication, and caching. Query hooks do not call APIs directly; they call service methods:

```typescript
import { useQuery } from "@tanstack/react-query";

export function useUserQuery(userId: string) {
  const userService = useUserService();
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => userService.getUser(userId),
  });
}

export function useUsersListQuery() {
  const userService = useUserService();
  return useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getUsers(),
  });
}
```

Components use the query hook:

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUserQuery(userId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{data?.name}</div>;
}
```

**Benefits**: TanStack Query automatically deduplicates requests, manages cache, and handles refetching. Services remain focused on API communication and validation. The abstraction boundary between component logic and service details is maintained.

## File Structure

Colocate services with the features that use them, following colocation principles:

```
src/
  features/
    users/
      UserService.ts           # Interface + factory implementation
      userService.types.ts     # Zod schemas, TypeScript types
      useUserQuery.ts          # TanStack Query hooks
      UserProfile.tsx          # Components
      UserProfile.test.tsx
    products/
      ProductService.ts
      productService.types.ts
      useProductsQuery.ts
      ProductCard.tsx
  lib/
    ServiceContext.tsx         # Central context provider for all services
```

**Principles:**

- Each feature owns its service, types, and query hooks
- Keep service interface and factory together
- Colocate Zod schemas with the service that validates them
- Place context provider in a single centralized location at root level
- Organize query hooks with their service in the feature
- Components import only hooks, never services or implementations directly
- Move service to `src/lib/services/` only if used by 2+ features

## Implementation Checklist

- Define service interface with all required methods
- Create Zod schema(s) for each API response type
- Implement service class/object with `Zod.parse()` immediately after every API call
- Create React context with service instance
- Create provider component wrapping application root
- Create `useService()` hook(s) for components to access service from context
- Create TanStack Query hook(s) that call service methods in `queryFn`
- In components: use query hooks, never import services or make direct API calls
- In tests: create mock service implementing same interface, provide via context

## Common Scenarios

### Testing

Create mock services implementing the same interfaces. Provide mocks in tests using the unified ServiceContext:

```typescript
const mockServices: Services = {
  userService: {
    getUser: jest.fn().mockResolvedValue({ id: "1", name: "Test" }),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
  productService: {
    getProduct: jest.fn(),
    // ... other methods
  },
};

render(
  <ServiceContext.Provider value={mockServices}>
    <UserProfile userId="1" />
  </ServiceContext.Provider>
);
```

No actual API calls are made. All services are fully replaceable for testing.

### Error Handling

Services throw errors from Zod validation failures or API failures. TanStack Query captures these errors in the hook's `error` state. Components handle errors through the query hook:

```typescript
const { data, error } = useUserQuery(userId);
if (error) return <div>Error: {error.message}</div>;
```

### Optional Services

Make service properties optional in the Services interface and check before use:

```typescript
interface Services {
  userService: UserService;
  analyticsService?: AnalyticsService;
}

export function useAnalyticsService(): AnalyticsService {
  const services = React.useContext(ServiceContext);
  if (!services?.analyticsService) {
    throw new Error("AnalyticsService not available");
  }
  return services.analyticsService;
}
```
