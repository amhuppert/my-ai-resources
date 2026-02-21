# react-hotkeys-hook Reference Guide for AI Agents

<Overview>
`react-hotkeys-hook` (v5.x) is a React hook library for declarative keyboard shortcut handling. It provides `useHotkeys` to bind key combinations, sequences, and single keys to callbacks — with support for focus scoping via refs, global scopes via context, form tag integration, and cross-platform modifier handling. ESM-only since v5.
</Overview>

## Installation

```bash
npm install react-hotkeys-hook
# or
bun add react-hotkeys-hook
```

- **Current version**: 5.2.4
- **Peer dependency**: React 18+
- **ESM-only** — CommonJS not supported in v5

## Core Concepts

- **Code vs Key**: By default, the hook listens to `KeyboardEvent.code` (physical key position). Set `useKey: true` to listen to the produced character instead (important for non-US keyboard layouts)
- **Global by default**: Hotkeys fire globally unless scoped to an element via the returned ref
- **Callback memoization**: The callback is memoized — all referenced variables must be in the `deps` array or you get stale closures
- **Modifier aliases**: `ctrl`/`control`, `cmd`/`command`/`meta`, `alt`/`option`, `mod` (Cmd on macOS, Ctrl elsewhere)

## API Reference

### `useHotkeys`

```typescript
function useHotkeys<T extends HTMLElement>(
  keys: string | string[],
  callback: (event: KeyboardEvent, handler: HotkeysEvent) => void,
  options?: Options,
  deps?: DependencyList
): React.MutableRefObject<T | null>
```

**Overloaded signature** (skip options, pass deps directly):

```typescript
useHotkeys(keys, callback, deps)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `keys` | `string \| string[]` | Key combo(s) to listen for. Comma-separated or array |
| `callback` | `(event: KeyboardEvent, handler: HotkeysEvent) => void` | Fires when hotkey matches |
| `options` | `Options` | Configuration (see below) |
| `deps` | `DependencyList` | Dependency array for callback memoization |

#### Return Value

Returns `React.MutableRefObject<T | null>`. Attach to a DOM element to scope the hotkey to that element's focus.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean \| (e: KeyboardEvent, h: HotkeysEvent) => boolean` | `true` | Enable/disable the hotkey. Function form for dynamic control |
| `enableOnFormTags` | `boolean \| FormTags[]` | `false` | Fire inside `input`, `textarea`, `select`. Pass `true` for all, or array like `['input', 'textarea']` |
| `enableOnContentEditable` | `boolean` | `false` | Fire inside contentEditable elements |
| `combinationKey` | `string` | `+` | Separator for key combinations (e.g., `ctrl+k`) |
| `splitKey` | `string` | `,` | Separator for multiple hotkey definitions in a single string |
| `scopes` | `string \| string[]` | `*` | Named scope(s) this hotkey belongs to. Requires `HotkeysProvider` |
| `keyup` | `boolean` | `false` | Trigger on keyUp |
| `keydown` | `boolean` | `true` | Trigger on keyDown |
| `preventDefault` | `boolean \| (e: KeyboardEvent, h: HotkeysEvent) => boolean` | `false` | Prevent default browser behavior |
| `description` | `string` | `undefined` | Metadata description for the hotkey |
| `document` | `Document` | `undefined` | Bind to a specific document (useful for iframes) |
| `ignoreModifiers` | `boolean` | `false` | Ignore modifier keys when matching |
| `useKey` | `boolean` | `false` | Listen to produced character instead of key code. Use for international keyboard layouts |

#### `HotkeysEvent` Object

```typescript
interface HotkeysEvent {
  keys: string[]    // Array of pressed keys
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
}
```

### `isHotkeyPressed`

Check if a key is currently pressed. Useful for checking modifier state in click handlers.

```typescript
function isHotkeyPressed(key: string | string[], splitKey?: string): boolean
```

```tsx
import { isHotkeyPressed } from 'react-hotkeys-hook'

const handleClick = () => {
  if (isHotkeyPressed('shift')) {
    // Shift+click behavior
  }
}
```

### `HotkeysProvider`

Context provider for scope-based hotkey management.

```tsx
import { HotkeysProvider } from 'react-hotkeys-hook'

function App() {
  return (
    <HotkeysProvider initiallyActiveScopes={['global']}>
      <MyApp />
    </HotkeysProvider>
  )
}
```

### `useHotkeysContext`

Access and control active scopes programmatically.

```typescript
const { activeScopes, enableScope, disableScope, toggleScope } = useHotkeysContext()
```

## Key Syntax

### Single Keys

```typescript
useHotkeys('a', callback)           // Letter
useHotkeys('enter', callback)       // Special key
useHotkeys('escape', callback)      // Escape
useHotkeys('space', callback)       // Space
useHotkeys('arrowup', callback)     // Arrow keys
useHotkeys('f1', callback)          // Function keys
useHotkeys('*', callback)           // Wildcard: all keys
```

### Modifier Combinations

```typescript
useHotkeys('ctrl+k', callback)          // Ctrl + K
useHotkeys('ctrl+shift+a', callback)    // Ctrl + Shift + A
useHotkeys('meta+s', callback)          // Cmd/Win + S
useHotkeys('mod+s', callback)           // Cmd on macOS, Ctrl elsewhere
useHotkeys('alt+n', callback)           // Alt + N
```

### Multiple Hotkeys (comma-separated or array)

```typescript
// Comma-separated string
useHotkeys('ctrl+k, ctrl+j', callback)

// Array form (preferred for clarity)
useHotkeys(['ctrl+k', 'ctrl+j'], callback)
```

### Key Sequences (vim-style)

Use `>` to define sequential key presses:

```typescript
useHotkeys('g>g', () => scrollToTop())                     // Press g, then g
useHotkeys('ctrl+k>ctrl+b', () => toggleSidebar())         // Ctrl+K, then Ctrl+B
```

## Common Patterns

### Global Hotkey

```tsx
function App() {
  useHotkeys('ctrl+k', (e) => {
    e.preventDefault()
    openCommandPalette()
  })
  return <div>...</div>
}
```

### Scoped to Element (Focus Trap)

```tsx
function Editor() {
  const ref = useHotkeys<HTMLDivElement>('ctrl+s', (e) => {
    e.preventDefault()
    save()
  })

  return (
    <div ref={ref} tabIndex={-1}>
      {/* Hotkey only fires when this div is focused */}
    </div>
  )
}
```

### Conditional Hotkey

```tsx
function Modal({ isOpen }: { isOpen: boolean }) {
  useHotkeys('escape', () => close(), { enabled: isOpen }, [isOpen])
  return isOpen ? <div>...</div> : null
}
```

### Hotkey in Form Inputs

```tsx
function SearchInput() {
  useHotkeys('ctrl+enter', () => submitSearch(), {
    enableOnFormTags: ['input'],
    preventDefault: true,
  })
  return <input type="text" />
}
```

### Named Scopes

```tsx
function App() {
  return (
    <HotkeysProvider initiallyActiveScopes={['navigation']}>
      <Sidebar />
      <Editor />
    </HotkeysProvider>
  )
}

function Sidebar() {
  const { enableScope, disableScope } = useHotkeysContext()
  useHotkeys('ctrl+b', () => toggle(), { scopes: ['navigation'] })
  // ...
}

function Editor() {
  useHotkeys('ctrl+s', () => save(), { scopes: ['editor'] })
  // ...
}
```

### Using State in Callback (Dependency Array)

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  // CORRECT: count in deps array
  useHotkeys('up', () => setCount(count + 1), [count])

  // ALSO CORRECT: functional updater avoids needing deps
  useHotkeys('down', () => setCount(c => c - 1))

  return <span>{count}</span>
}
```

### Prevent Default Browser Behavior

```tsx
// Boolean form
useHotkeys('ctrl+s', () => save(), { preventDefault: true })

// Function form (conditional)
useHotkeys('ctrl+s', () => save(), {
  preventDefault: (e, handler) => {
    return document.activeElement?.tagName !== 'INPUT'
  }
})
```

## Troubleshooting / Gotchas

### Stale Closure (Most Common Bug)

**Problem**: Callback reads stale state because referenced variables are not in the dependency array.

```tsx
// BUG: count is always 0 inside the callback
const [count, setCount] = useState(0)
useHotkeys('space', () => console.log(count))     // always logs 0

// FIX 1: Add to deps
useHotkeys('space', () => console.log(count), [count])

// FIX 2: Use functional updater (no deps needed)
useHotkeys('space', () => setCount(c => c + 1))
```

### Hotkeys Don't Fire in Input Fields

**Problem**: By default, hotkeys are suppressed when focus is on `<input>`, `<textarea>`, or `<select>`.

**Fix**: Set `enableOnFormTags`:

```tsx
useHotkeys('ctrl+enter', callback, { enableOnFormTags: true })
// or specific tags:
useHotkeys('ctrl+enter', callback, { enableOnFormTags: ['input', 'textarea'] })
```

### Non-Interactive Elements Can't Receive Focus

**Problem**: Assigning the ref to a `<div>`, `<section>`, or `<span>` doesn't work because these elements can't receive focus.

**Fix**: Add `tabIndex={-1}` (avoids disrupting tab navigation):

```tsx
const ref = useHotkeys<HTMLDivElement>('enter', callback)
return <div ref={ref} tabIndex={-1}>...</div>
```

**Note**: `tabIndex={-1}` may cause a focus outline. Remove with CSS:

```css
[tabindex="-1"]:focus { outline: none; }
```

### International Keyboard Layouts

**Problem**: Keys like `y` and `z` are swapped on German layouts. By default, the hook uses `KeyboardEvent.code` (physical position).

**Fix**: Set `useKey: true` to match the produced character instead:

```tsx
useHotkeys('z', callback, { useKey: true })  // Matches "z" character on any layout
```

### `mod` Modifier on macOS

**Known issue**: The `mod` modifier (intended as Cmd on macOS, Ctrl elsewhere) may listen to `ctrl` on macOS in some versions. Test cross-platform behavior and consider using explicit `meta` for macOS or `ctrl` for Windows/Linux if `mod` is unreliable.

### keyup Not Firing with Meta Key

**Known issue**: `meta + <key>` combinations may not fire the `keyup` callback. This is a browser-level limitation — macOS releases the meta key differently. Avoid relying on `keyup` with meta combinations.

### keyup/keydown Interaction

**Gotcha**: Setting `keyup: true` without explicitly setting `keydown` causes the hook to **only** listen to keyUp. To trigger on both events:

```tsx
useHotkeys('ctrl+s', callback, { keyup: true, keydown: true })
```

### Multiple Hotkeys on Same Key (Scope Conflicts)

**Problem**: Multiple components register the same hotkey and both fire.

**Fix**: Use scopes via `HotkeysProvider` or ref-based focus scoping:

```tsx
// Scope approach
useHotkeys('escape', closeModal, { scopes: ['modal'] })
useHotkeys('escape', closeSidebar, { scopes: ['sidebar'] })

// Ref approach (only fires when element is focused)
const modalRef = useHotkeys<HTMLDivElement>('escape', closeModal)
```

### Modifier Key Held While Pressing Another Key

**Known issue**: Pressing a modifier key while another key is held can unexpectedly trigger the second key's hotkey. Tracked for fix in future versions.

### ESM-Only (v5 Breaking Change)

If you see CommonJS/ESM import errors after upgrading to v5, ensure your bundler supports ESM. Next.js App Router handles this natively.

## Version Migration (v4 to v5)

| Change | v4 | v5 |
|--------|----|----|
| Module format | CJS + ESM | ESM only |
| Callback params | `(keyboardEvent, hotkeysEvent)` | Same, but consistently applied |
| Key sequences | Not supported | `>` separator (e.g., `g>g`) |
| Global scopes | Basic | Full `HotkeysProvider` + `useHotkeysContext` |
| `useKey` option | Available | Available (unchanged) |

## Quick Decision Guide

| Scenario | Approach |
|----------|----------|
| App-wide shortcut (e.g., Cmd+K) | Global `useHotkeys` at top level, `preventDefault: true` |
| Component-specific shortcut | Attach returned ref to element, add `tabIndex={-1}` if non-interactive |
| Shortcut in text input | `enableOnFormTags: ['input']` with modifier combo |
| Multiple shortcut groups | `HotkeysProvider` with named scopes |
| Cross-platform Cmd/Ctrl | Use `mod` modifier (test for known issues) or branch with `navigator.platform` |
| Non-US keyboard layout | Set `useKey: true` |
| Avoid stale state | Use functional updaters or add all vars to `deps` |
