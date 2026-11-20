# Colocation standards

Keep files that change together as close to each other as practical. Moving related code into distant layer folders (`/utils`, `/hooks`, `/styles`, `/tests`) makes refactoring harder, encourages drift, and hides dead code.

## Core rules

| Concern | Standard | Anti-pattern |
| --- | --- | --- |
| Unit tests | Next to the source file (`Button.tsx` + `Button.test.tsx`) | Mirrored `tests/` directory |
| Component styles | Next to the component (`Button.module.css` or `Button.styles.ts`) | Central `styles/` directory |
| State | Next to consuming components (`ProfileContext.tsx`, local store) | Global `store/` slice used by one feature |
| Helpers and utilities | Inside the feature or same file; `/lib` only for truly cross-feature code | Dumping single-use helpers into a central `utils/` folder |
| Types and constants | Inside the feature directory (`auth.types.ts`) | Central `/types` or `/constants` folders |
| Feature config and docs | Feature config in the feature directory; API docs inline with code (JSDoc) | Scattered root config or detached `/docs` files that drift |

## Target layouts

### Frontend (React / Next.js / Vite)

Organize by feature, not by technical layer:

```text
src/
├── App.tsx
├── lib/                          # Truly cross-feature utilities only
│   ├── format.ts
│   └── validation.ts
└── features/
    ├── auth/
    │   ├── AuthProvider.tsx
    │   ├── AuthProvider.test.tsx
    │   ├── useAuth.ts
    │   ├── LoginForm.tsx
    │   ├── LoginForm.module.css
    │   └── auth.types.ts
    └── products/
        ├── ProductCard.tsx
        ├── ProductCard.test.tsx
        ├── useProducts.ts
        ├── productApi.ts
        └── product.types.ts
```

In Next.js App Router, colocate route-specific components, hooks, tests, and types directly inside the route folder (`app/products/`).

### Backend (Node / Express)

Keep a feature's routes, controller, service, repository, validation, types, and tests together:

```text
src/
├── index.ts
├── lib/                          # Shared logger, validation helpers
├── middleware/                   # App-wide middleware + colocated tests
└── features/
    └── orders/
        ├── orders.routes.ts
        ├── ordersController.ts
        ├── ordersController.test.ts
        ├── ordersService.ts
        ├── ordersService.test.ts
        ├── ordersRepository.ts
        └── orders.types.ts
```

## Decision rules

- Used by only one feature or component? Keep it inside that feature, even if it looks "reusable."
- Files routinely edited in the same commit? Put them in the same directory.
- Framework-specific (React hook, Express middleware)? Keep it next to its consumer.
- Promote to `src/lib/` only when genuinely shared across 2+ unrelated features.

## Valid exceptions

Do not flag distant placement when it exists for one of these reasons:

1. Genuinely shared utilities used across the whole app (`src/lib/`).
2. App-wide cross-cutting concerns (global middleware, auth strategy, root logging).
3. Framework-mandated folders (`app/`, `public/`, Nuxt `server/` and `composables/`).
4. Workspace boundaries in a monorepo (apply colocation inside each package).
5. Isolated third-party SDK wrappers shared across features.
