# Colocation Standards

## Principle

Place code as close as possible to where it's relevant and used. "Things that change together should be located as close to each other as reasonable."

This means:

- Related files stay together (reducing drift and synchronization issues)
- Developers see all relevant code without navigating distant directories
- Context-switching is minimized
- Code moves more easily to external packages or other projects
- Unused code becomes visibly orphaned

## Core Applications

### Components and Their Tests

**Standard:** Unit tests live adjacent to the code they test, not in mirrored `test/` directories.

| ❌ Anti-pattern                                               | ✅ Pattern                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/Button.tsx`<br>`tests/Button.test.tsx`                   | `src/Button.tsx`<br>`src/Button.test.tsx`                   |
| `src/utils/formatDate.ts`<br>`tests/utils/formatDate.test.ts` | `src/utils/formatDate.ts`<br>`src/utils/formatDate.test.ts` |

**Rationale:** When you modify `Button.tsx`, its test sits right there. You won't miss updating tests. If you delete the component, its test is obviously orphaned.

### Styles and Components

**Standard:** Component styles live with the component, never in a separate stylesheet directory.

| ❌ Anti-pattern                                 | ✅ Pattern                                           |
| ----------------------------------------------- | ---------------------------------------------------- |
| `src/Button.tsx`<br>`styles/button.css`         | `src/Button.tsx`<br>`src/Button.module.css`          |
| `components/Card.tsx`<br>`themes/card-dark.css` | `components/Card.tsx`<br>`components/Card.styles.ts` |

**Rationale:** Styles and markup co-evolve. Separate directories create broken links when one is refactored without the other.

### Application State and Usage

**Standard:** State lives as close as possible to the component(s) consuming it.

| ❌ Anti-pattern                                                             | ✅ Pattern                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Global store in `src/store/`<br>Used only in `src/pages/Profile/`           | State in `src/pages/Profile/ProfileContext.tsx` or `ProfileProvider.tsx` |
| Redux store in `state/user.ts`<br>Used by `UserAvatar.tsx` in `components/` | State in `components/UserAvatar/userAvatarStore.ts` or same file         |

**Rationale:** Local state is easier to refactor, test, and move to other projects. Global state should only be truly global (e.g., current user, theme, auth).

### Utilities and Helpers

**Standard:** Small, frequently-used utilities stay near their usage sites. Only shared utility libraries (`/lib`, `/utils`) contain genuinely cross-project code.

| ❌ Anti-pattern                                                          | ✅ Pattern                                                                   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Utility in `utils/calculateDiscount.ts` (used only by `PricingCard.tsx`) | Utility in `PricingCard/calculateDiscount.ts` or inline in `PricingCard.tsx` |
| Shared utilities directory: 50 functions scattered across project usage  | Clear `/lib` dir with only truly cross-component utilities                   |

**Rationale:** Most utilities aren't truly "shared." Moving code into a central utils directory makes each utility feel important when it's only used once. Keep it local.

### Documentation and Examples

**Standard:** API documentation and usage examples live with their subject, not in separate `/docs` directories.

| ❌ Anti-pattern                                                                 | ✅ Pattern                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/hooks/useCart.ts` with only JSDoc<br>`docs/useCart.md` with detailed guide | `src/hooks/useCart.ts` with comprehensive JSDoc + inline examples |
| `src/api/client.ts`<br>`docs/api-guide.md`                                      | `src/api/client.ts` with detailed comments and examples           |

**Rationale:** Documentation drifts when it's separate from code. Inline documentation updates when code updates.

### Configuration Files

**Standard:** Configuration lives near the code it configures, not in a central `/config` directory.

| ❌ Anti-pattern                                                                                | ✅ Pattern                                                                                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| All env configs in `.env.example` at project root<br>Feature-specific config scattered in code | `.env.example` at root<br>Feature-specific config in feature's directory<br>`src/auth/auth.config.ts` |

**Rationale:** Developers working on a feature see its configuration needs immediately.

## Directory Structure Patterns

### React/Frontend Application

```
src/
├── App.tsx
├── lib/                          # Truly shared utilities (date, math, validation)
│   ├── format.ts
│   └── validation.ts
├── pages/
│   ├── HomePage.tsx
│   ├── ProfilePage.tsx
│   └── NotFoundPage.tsx
└── features/                     # Feature-based organization
    ├── auth/
    │   ├── AuthProvider.tsx
    │   ├── AuthProvider.test.tsx
    │   ├── useAuth.ts
    │   ├── useAuth.test.ts
    │   ├── LoginForm.tsx
    │   ├── LoginForm.test.tsx
    │   ├── LoginForm.module.css
    │   └── auth.types.ts
    ├── products/
    │   ├── ProductCard.tsx
    │   ├── ProductCard.test.tsx
    │   ├── ProductCard.module.css
    │   ├── ProductList.tsx
    │   ├── ProductList.test.tsx
    │   ├── useProducts.ts
    │   ├── useProducts.test.ts
    │   ├── productApi.ts
    │   └── product.types.ts
    └── cart/
        ├── CartContext.tsx
        ├── CartContext.test.tsx
        ├── CartIcon.tsx
        ├── CartIcon.test.tsx
        ├── useCart.ts
        └── useCart.test.ts
```

**Key principles:**

- Each feature is self-contained
- Related code (components, hooks, types, tests, styles) stays in the same directory
- Cross-feature utilities go to `/lib`
- No separate `/utils`, `/hooks`, or `/components` directories
- Tests live next to their source files
- Each feature's directory contains everything needed to use or test that feature

### Backend/Node Application

```
src/
├── index.ts
├── lib/                          # Shared utilities
│   ├── logger.ts
│   └── validation.ts
├── middleware/
│   ├── auth.ts
│   ├── auth.test.ts
│   ├── errorHandler.ts
│   └── errorHandler.test.ts
└── features/
    ├── users/
    │   ├── userController.ts
    │   ├── userController.test.ts
    │   ├── userService.ts
    │   ├── userService.test.ts
    │   ├── userRepository.ts
    │   ├── userRepository.test.ts
    │   ├── user.types.ts
    │   └── user.routes.ts
    ├── products/
    │   ├── productController.ts
    │   ├── productService.ts
    │   ├── productRepository.ts
    │   ├── product.types.ts
    │   └── product.routes.ts
    └── auth/
        ├── authService.ts
        ├── authService.test.ts
        ├── authController.ts
        ├── jwtStrategy.ts
        └── auth.types.ts
```

**Key principles:**

- Feature-based organization (not layer-based like `/controllers`, `/services`, `/repositories`)
- Related layers (controller, service, repository) stay in the same feature directory
- Each feature has its own route file and type definitions
- Tests live next to tested code
- Shared middleware in `/middleware` near the root

## Decision Framework

Use this framework to decide whether to apply colocation:

| Question                                                          | Answer                                                   | Action                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Is this code used by multiple components/features?                | No                                                       | Keep it local, next to usage                                          |
| Is this code used in only one place?                              | Yes                                                      | Keep it local, even if it seems "reusable"                            |
| Is this code framework-specific (React hook, Express middleware)? | Yes                                                      | Keep it near its usage context                                        |
| Would moving this code break other code?                          | Yes                                                      | It's likely not as reusable as it seems; consider moving usage closer |
| Do multiple files change together?                                | Yes                                                      | Place them in the same directory                                      |
| Would this code work if moved to a separate package?              | Yes, only if it stays with its tests/types/documentation | Keep all parts together                                               |

## Tech Stack Patterns

### React + TypeScript

```
src/features/Modal/
├── Modal.tsx                    # Component
├── Modal.test.tsx               # Tests
├── Modal.module.css             # Styles
├── useModal.ts                  # Hook for this feature
├── useModal.test.ts
├── modal.types.ts               # Types used by Modal
└── modal.constants.ts           # Constants used by Modal
```

### Vue + TypeScript

```
src/features/Dialog/
├── Dialog.vue
├── Dialog.test.ts
├── useDialog.ts
├── useDialog.test.ts
├── dialog.types.ts
└── dialog.styles.scss
```

### Svelte

```
src/features/Drawer/
├── Drawer.svelte
├── Drawer.test.ts
├── drawer.types.ts
└── drawer.styles.scss
```

### Next.js

```
app/products/
├── page.tsx                     # Route component
├── page.test.tsx
├── ProductCard.tsx              # Local component
├── ProductCard.test.tsx
├── useProducts.ts               # Local hook
├── productApi.ts                # Local API calls
└── product.types.ts
```

### Express / Node.js with Layers

```
src/features/Orders/
├── orders.routes.ts
├── OrdersController.ts
├── OrdersController.test.ts
├── OrdersService.ts
├── OrdersService.test.ts
├── OrdersRepository.ts
├── orders.types.ts
└── orders.validation.ts
```

## Anti-Patterns to Avoid

### ❌ Central Utility Dump

```
src/
├── utils/
│   ├── formatDate.ts
│   ├── calculatePrice.ts
│   ├── validateEmail.ts
│   └── ... 50 more
├── components/
├── pages/
```

**Problem:** Functions scatter into utils directory, making it unclear if they're actually used. Bloated utils directory becomes hard to navigate.

**Fix:** Keep each utility with the code that uses it. Only move to `/lib` if used across multiple features.

### ❌ Mirrored Directory Structure

```
src/
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   └── Modal.tsx
tests/
├── components/
│   ├── Button.test.tsx
│   ├── Card.test.tsx
│   └── Modal.test.tsx
```

**Problem:** Tests live far from source code. Easy to miss updating tests when code changes. Tempting to not write tests because they're inconvenient.

**Fix:** Place tests adjacent to source: `src/Button.test.tsx` next to `src/Button.tsx`.

### ❌ Central Style Directory

```
src/
├── components/Button.tsx
├── components/Card.tsx
styles/
├── button.css
├── card.css
```

**Problem:** Styles separate from components they style. Easy to delete component and forget styles (or vice versa). Naming conventions drift.

**Fix:** Collocate styles: `Button.tsx` with `Button.module.css` or `Button.styles.ts`.

### ❌ Global State for Everything

```
src/store/
├── userSlice.ts            # Used only in Profile feature
├── cartSlice.ts            # Used only in Cart feature
├── modalSlice.ts           # Used only in Modal component
└── index.ts
```

**Problem:** Even local state ends up global, making it harder to test, refactor, and move code.

**Fix:** Keep state with its consumers:

- `src/features/Profile/profileContext.tsx`
- `src/features/Cart/cartContext.tsx`
- `src/components/Modal/useModal.ts`

## Implementation Checklist

When organizing or reorganizing a project:

- [ ] Tests live adjacent to tested code
- [ ] Styles are in the same directory as components
- [ ] State providers and hooks are near their usage
- [ ] Types live with the code they describe
- [ ] Constants are near their usage (not in a central `/constants`)
- [ ] API calls are organized by feature, not in a central `/api` (except shared clients)
- [ ] No separate `/utils` directory (only `/lib` for truly shared code)
- [ ] Each feature directory is self-contained and movable
- [ ] Documentation lives with its subject, not in `/docs`
- [ ] Configuration specific to a feature is in that feature's directory

## Exception Cases

These situations justify distant code:

1. **Truly shared, frequently used code** - Math utilities, date formatting, validation helpers used across the entire app → `/lib`
2. **Cross-cutting concerns** - Global middleware, auth strategies, logging → separate directories at root level
3. **Framework requirements** - Next.js `/app`, `/public`; Nuxt `/server`, `/composables`
4. **Large monorepos** - Separate packages may be necessary for scale, but apply colocation within each package
5. **Third-party integrations** - Auth provider SDKs, analytics wrappers might need a dedicated directory

## Benefits of Colocation

- **Faster refactoring** - All related code visible; fewer files to update
- **Clear dependencies** - Easier to see what a component truly needs
- **Better testing** - Tests right next to code; harder to skip testing
- **Easier code sharing** - Entire feature can move to a package without picking through multiple directories
- **Reduced context-switching** - Developer stays in one directory per feature
- **Visible dead code** - Unused code becomes obviously orphaned
- **Lower cognitive load** - Developers don't search multiple locations for related code
