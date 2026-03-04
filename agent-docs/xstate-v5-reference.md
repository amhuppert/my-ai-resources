# XState V5 Reference Guide for AI Agents

<Overview>
XState V5 is a state management and orchestration library for JavaScript/TypeScript using state machines, statecharts, and the actor model. Every running process is an **actor** — the primary abstraction. Actor logic (machine, promise, callback, etc.) is a pure description of behavior; actors are the executing instances.
</Overview>

## Installation

```bash
npm install xstate
```

**TypeScript requirements:**
- TypeScript 5.0+
- `strictNullChecks: true` (required for correct type inference)
- `skipLibCheck: true` (recommended for build performance)

**Framework integrations:** `@xstate/react`, `@xstate/vue`, `@xstate/svelte`, `@xstate/solid`

---

## Core Concepts

### Actor Model

- **Encapsulation**: each actor has private internal state, updatable only by itself
- **Async messaging**: communication via asynchronous event passing
- **Sequential processing**: actors process one message at a time from an internal mailbox
- **Spawning**: actors can create child actors

### Machine vs Actor

- **Machine**: the blueprint/specification (created via `createMachine`)
- **Actor**: a running instance executing the blueprint (created via `createActor`)
- Multiple actors from one machine are completely independent with separate state

### Snapshot

- Immutable state representation returned by `actor.getSnapshot()`
- Properties: `value`, `context`, `status`, `output`, `error`, `children`
- Methods: `matches(value)`, `hasTag(tag)`, `can(event)`, `getMeta()`
- `status`: `'active'` | `'done'` | `'error'` | `'stopped'`

---

## `setup()` + `createMachine()` (Recommended Pattern)

`setup()` defines types and named implementations before calling `.createMachine()`. This is the primary way to get full TypeScript type safety.

```typescript
import { setup, assign, fromPromise } from 'xstate';

const machine = setup({
  types: {
    context: {} as { count: number; user: User | null },
    events: {} as
      | { type: 'increment'; value: number }
      | { type: 'fetch'; userId: string },
    input: {} as { initialCount: number },
    output: {} as { finalCount: number },
    emitted: {} as { type: 'notification'; message: string },
    tags: 'pending' | 'success' | 'error',
  },
  actors: {
    fetchUser: fromPromise<User, { userId: string }>(async ({ input }) => {
      const res = await fetch(`/api/users/${input.userId}`);
      return res.json();
    }),
  },
  actions: {
    greet: (_, params: { name: string }) => {
      console.log(`Hello, ${params.name}!`);
    },
  },
  guards: {
    isPositive: ({ context }) => context.count > 0,
  },
  delays: {
    timeout: 1000,
    retryDelay: ({ context }) => context.retryCount * 1000,
  },
}).createMachine({
  id: 'example',
  context: ({ input }) => ({ count: input.initialCount, user: null }),
  initial: 'idle',
  states: {
    idle: {
      on: { increment: { actions: assign({ count: ({ context, event }) => context.count + event.value }) } },
    },
    // ...
  },
  output: ({ context }) => ({ finalCount: context.count }),
});
```

### All `types` Properties (all optional)

| Property | Type Pattern | Purpose |
|----------|-------------|---------|
| `context` | `{} as { ... }` | Machine context shape |
| `events` | `{} as Event1 \| Event2` | Union of all event types |
| `input` | `{} as { ... }` | Input to `createActor()` |
| `output` | `{} as { ... }` | Final machine output |
| `emitted` | `{} as { type: string; ... }` | Events emitted via `emit()` |
| `children` | `{} as { id: 'actorSrc' }` | Child actor type mapping |
| `delays` | `'name1' \| 'name2'` | Named delay string union |
| `tags` | `'tag1' \| 'tag2'` | Tag string union |
| `meta` | `{} as { ... }` | State metadata type |

---

## `createMachine(config)` Without `setup()`

```typescript
const machine = createMachine({
  id: 'feedback',
  types: {} as {
    context: { feedback: string };
    events: { type: 'submit' } | { type: 'update'; value: string };
  },
  context: { feedback: '' },
  initial: 'editing',
  states: {
    editing: {
      on: {
        update: { actions: assign({ feedback: ({ event }) => event.value }) },
        submit: { target: 'submitting' },
      },
    },
    submitting: { /* ... */ },
  },
});
```

---

## `createActor(logic, options?)`

```typescript
import { createActor } from 'xstate';

const actor = createActor(machine, {
  input: { initialCount: 0 },   // passed to context factory
  inspect: (event) => {},        // inspection callback
  snapshot: persistedSnapshot,   // restore from persisted state
  systemId: 'root',              // system-wide unique ID
  clock: new SimulatedClock(),   // for testing delayed transitions
});

actor.subscribe((snapshot) => {
  console.log(snapshot.value, snapshot.context);
});

// Full observer form
actor.subscribe({
  next(snapshot) {},
  error(err) {},
  complete() {},
});

actor.start();
actor.send({ type: 'increment', value: 1 });
actor.stop();
```

### Key Actor Methods

| Method | Description |
|--------|-------------|
| `.start()` | Begin execution (required before sending events) |
| `.stop()` | Terminate actor and all children |
| `.send(event)` | Dispatch event object (not string — v5 requires objects) |
| `.subscribe(observer)` | Register snapshot observer; returns `{ unsubscribe() }` |
| `.getSnapshot()` | Synchronously read current snapshot |
| `.getPersistedSnapshot()` | Get JSON-serializable snapshot for persistence |
| `.on(eventType, handler)` | Listen for emitted events (not state transitions) |
| `.system` | Access the actor system |

<critical>
`actor.subscribe()` does NOT immediately emit the current snapshot (changed from v4). Use `actor.getSnapshot()` for the current state.
</critical>

---

## State Node Configuration

Each state in `states` accepts:

```typescript
{
  on: { [eventType]: transition | transition[] },
  entry: action | action[],          // on state entry
  exit: action | action[],           // on state exit
  invoke: invokeConfig | invokeConfig[],
  after: { [delay]: transition },    // delayed transitions
  always: transition | transition[], // eventless transitions
  initial: 'childStateName',        // for compound states
  states: { /* child states */ },    // for compound/parallel states
  type: 'parallel' | 'final' | 'history',
  tags: string[],
  meta: Record<string, unknown>,
  output: value | ({ context }) => value,  // for final states
  history: 'shallow' | 'deep',      // for history states
  target: 'defaultChild',           // for history states (fallback)
}
```

---

## Transitions

### Event Objects

```typescript
actor.send({ type: 'feedback.update', feedback: 'Great!', rating: 5 });
```

### Transition Formats

```typescript
// String shorthand (target only)
on: { submit: 'submitting' }

// Object form
on: {
  submit: {
    target: 'submitting',
    guard: 'isValid',
    actions: 'logSubmit',
    reenter: true,  // re-execute entry/exit
  },
}

// Multiple guarded transitions (first match wins, default must be last)
on: {
  respond: [
    { guard: 'isPositive', target: 'happy' },
    { guard: 'isNegative', target: 'sad' },
    { target: 'neutral' },  // default — no guard
  ],
}
```

### Target Path Formats

| Pattern | Description | Example |
|---------|-------------|---------|
| `'sibling'` | Sibling state | `target: 'thanks'` |
| `'sibling.child'` | Sibling's descendant | `target: 'form.step2'` |
| `'.child'` | Child of current state | `target: '.editing'` |
| `'.child.grandchild'` | Descendant of current | `target: '.mode.dark'` |
| `'#stateId'` | Any state by ID | `target: '#done'` |

### Self-Transitions

| Type | Config | Entry/Exit | Child States | Invocations |
|------|--------|-----------|--------------|-------------|
| Targetless | no `target` | not re-executed | preserved | kept running |
| Targeted | `target: 'sameState'` | not re-executed | re-resolved to initial | kept running |
| Re-entering | `target` + `reenter: true` | re-executed | reset | restarted |

### Wildcard Transitions

```typescript
on: {
  '*': { target: 'awake' },             // full wildcard (lowest priority, catch-all)
  'feedback.*': { target: 'form' },     // partial wildcard (prefix match)
}
// Valid: 'mouse.*', 'mouse.click.*'
// INVALID: 'mouse*', '*.click', 'mouse.*.click'
```

### Forbidden Transitions

Prevent parent from handling an event:

```typescript
on: { forbidden: {} }  // no target or actions — halts upward search
```

### Transition Selection Algorithm

1. Start at deepest active (atomic) state nodes
2. Check if transition is enabled (no guard, or guard returns true)
3. If not enabled, walk up to parent state
4. If no transitions enabled anywhere, state unchanged

---

## Eventless (Always) Transitions

Execute immediately after normal transitions when conditions are met.

```typescript
states: {
  checkAge: {
    always: [
      { guard: ({ context }) => context.age >= 18, target: 'adult' },
      { target: 'minor' },
    ],
  },
}
```

<critical>
- `always` with no `target` and no `guard` causes infinite loop
- Target must differ from current state
- Transient states (entered and exited via `always` in one step) are NOT observable via `subscribe()`, `waitFor()`, `matches()`, or `hasTag()`
- Entry/exit actions still execute on transient states
- Use `after: { 0: 'nextState' }` if observability is needed
- Use the inspection API (`@xstate.microstep`) to observe transient states
</critical>

---

## Delayed Transitions (`after`)

Timers are canceled when the state is exited.

```typescript
// Inline milliseconds
states: {
  waiting: {
    after: {
      5000: { target: 'timedOut' },
    },
    on: {
      respond: { target: 'success' },  // event wins if it arrives before timer
    },
  },
}

// Named delay (via setup)
setup({
  delays: {
    timeout: 1000,
    retryDelay: ({ context }) => context.attempts * 1000,  // dynamic
  },
}).createMachine({
  states: {
    idle: {
      after: { timeout: { target: 'active' } },
    },
  },
})
```

---

## Actions

Actions are fire-and-forget side effects executed during transitions. They do not block.

### `assign()` — Update Context

```typescript
// Property assigners (preferred)
assign({
  count: ({ context, event }) => context.count + event.value,
  user: ({ event }) => event.user,
})

// Function assigner (full replacement)
assign(({ context, event }) => ({
  ...context,
  count: context.count + event.value,
}))
```

<critical>
Never mutate context directly. Always use `assign()`.

```typescript
// WRONG — causes bugs with shared state across actors
entry: ({ context }) => { context.count = 1; }

// WRONG — assign() returns a declarative object, not meant to be called inside functions
entry: ({ context }) => { assign({ count: 1 }); }

// CORRECT
entry: assign({ count: 1 })
```
</critical>

### `raise()` — Send Event to Self

```typescript
raise({ type: 'internalEvent' })
raise(({ context }) => ({ type: 'dynamic', data: context.value }))
raise({ type: 'delayed' }, { delay: 1000 })
```

Raised events go to internal queue, processed before external events (FIFO).

### `sendTo()` — Send Event to Another Actor

```typescript
sendTo('actorId', { type: 'ping' })
sendTo(({ context }) => context.actorRef, { type: 'ping' })
sendTo(({ system }) => system.get('notifier'), { type: 'notify' })
sendTo('actor', { type: 'event' }, { id: 'sendId', delay: 1000 })
```

### `sendParent()` — Send Event to Parent

```typescript
sendParent({ type: 'childDone', data: 'result' })
```

### `emit()` — Emit to External Listeners

```typescript
// In machine
actions: emit({ type: 'notification', message: 'Hello!' })

// External consumer
actor.on('notification', (event) => console.log(event.message));
actor.on('*', (event) => {}); // wildcard — all emitted events
```

### `enqueueActions()` — Conditional/Batched Actions

Replaces v4's `pure()` and `choose()`.

```typescript
entry: enqueueActions(({ context, event, enqueue, check }) => {
  enqueue.assign({ count: context.count + 1 });

  if (event.someFlag) {
    enqueue.sendTo('someActor', { type: 'notify' });
    enqueue('namedAction');
  }

  if (check({ type: 'someGuard' })) {
    enqueue.raise({ type: 'conditionalEvent' });
  }
})
```

Available: `enqueue()`, `enqueue.assign()`, `enqueue.sendTo()`, `enqueue.raise()`, `enqueue.spawnChild()`, `enqueue.stopChild()`, `enqueue.cancel()`

<critical>
Actions cannot be enqueued asynchronously — all enqueueing must be synchronous.
</critical>

### `log()`, `cancel()`, `stopChild()`

```typescript
log('message')
log(({ context }) => `Count: ${context.count}`)

cancel('delayedActionId')   // cancel delayed raise/sendTo by ID

stopChild('childActorId')
stopChild(({ context }) => context.childRef)
```

### Named Actions with Dynamic Parameters

```typescript
setup({
  actions: {
    greet: (_, params: { name: string }) => {
      console.log(`Hello, ${params.name}!`);
    },
  },
}).createMachine({
  entry: {
    type: 'greet',
    params: ({ context }) => ({ name: context.user.name }),
  },
})
```

### Entry/Exit Actions

```typescript
states: {
  active: {
    entry: ['startTimer', assign({ startedAt: () => Date.now() })],
    exit: ['stopTimer'],
  },
}
```

---

## Guards

Pure, synchronous functions returning `true` or `false`. No side effects.

```typescript
setup({
  guards: {
    isValid: ({ context }) => context.feedback.length > 0,
    isGreaterThan: (_, params: { value: number; min: number }) =>
      params.value > params.min,
  },
}).createMachine({
  on: {
    submit: { guard: 'isValid', target: 'submitting' },
    decrement: {
      guard: {
        type: 'isGreaterThan',
        params: ({ context }) => ({ value: context.count, min: 0 }),
      },
    },
  },
})
```

### Higher-Order Guards

```typescript
import { and, or, not, stateIn } from 'xstate';

guard: and(['isAuthenticated', 'isAdmin', not('isBanned')])
guard: or(['isAuthorized', 'isGuest'])
guard: stateIn({ form: 'submitting' })  // primarily for parallel states
```

---

## Context

```typescript
// Static (shares object reference across actors — fine for primitives)
context: { count: 0, user: null }

// Lazy (evaluated per actor — use when context contains mutable objects)
context: () => ({ items: [], createdAt: Date.now() })

// From input
context: ({ input }) => ({
  feedback: '',
  rating: input.defaultRating,
})
```

---

## Input

Input is configuration data provided when creating an actor. Replaces the v4 factory function pattern.

```typescript
setup({
  types: {
    input: {} as { userId: string; defaultRating: number },
  },
}).createMachine({
  context: ({ input }) => ({
    userId: input.userId,
    rating: input.defaultRating,
  }),
})

// Usage
const actor = createActor(machine, {
  input: { userId: '123', defaultRating: 5 },
}).start();
```

Input is also available in `invoke` and `spawn`:

```typescript
invoke: {
  src: 'fetchUser',
  input: ({ context }) => ({ userId: context.userId }),
}

// In assign
assign({
  child: ({ spawn }) => spawn('childLogic', {
    input: { mode: 'fast' },
  }),
})
```

---

## Output

Final data produced by an actor when it completes. Only available when `status === 'done'`.

```typescript
// Machine output (top-level, references context)
setup({
  types: { output: {} as { total: number } },
}).createMachine({
  // ...
  output: ({ context }) => ({
    total: context.items.reduce((sum, item) => sum + item.price, 0),
  }),
})

// Accessing output
if (snapshot.status === 'done') {
  console.log(snapshot.output);
}

// Via invoke
onDone: {
  target: 'success',
  actions: assign({ result: ({ event }) => event.output }),
}
```

### Type Utility

```typescript
import type { OutputFrom } from 'xstate';
type MyOutput = OutputFrom<typeof myMachine>;
```

---

## Actor Logic Creators

### Capabilities Matrix

| Feature | Machine | Promise | Transition | Observable | Callback |
|---------|:-------:|:-------:|:----------:|:----------:|:--------:|
| Receive events | Yes | No | Yes | No | Yes |
| Send events | Yes | Yes | Yes | Yes | Yes |
| Spawn actors | Yes | No | No | No | No |
| Input | Yes | Yes | Yes | Yes | Yes |
| Output | Yes | Yes | No | No | No |

### `fromPromise<TOutput, TInput>`

```typescript
const fetchUser = fromPromise<User, { userId: string }>(
  async ({ input, signal }) => {
    const res = await fetch(`/api/users/${input.userId}`, { signal });
    return res.json();
  }
);
```

- `signal`: `AbortSignal` — aborts when actor is stopped (pass to `fetch` for cancellation)
- Resolved value triggers `onDone`; rejection triggers `onError`
- Cannot receive events

### `fromCallback<TEvent, TInput>`

```typescript
const listener = fromCallback(({ sendBack, receive, input }) => {
  const handler = (e) => sendBack({ type: 'click', x: e.clientX });
  document.addEventListener('click', handler);

  receive((event) => {
    if (event.type === 'pause') { /* handle incoming events */ }
  });

  return () => document.removeEventListener('click', handler); // cleanup
});
```

- `sendBack(event)`: send event to parent
- `receive(handler)`: handle events sent to this actor
- Return a cleanup function
- Cannot be `async` — use `.then()` internally for promise-based work
- Does NOT support `onDone`/`onSnapshot`

### `fromTransition<TContext, TEvent>` (Reducer Pattern)

```typescript
const counter = fromTransition(
  (state, event) => {
    switch (event.type) {
      case 'inc': return { ...state, count: state.count + 1 };
      case 'dec': return { ...state, count: state.count - 1 };
      default: return state;
    }
  },
  { count: 0 } // initial state (or function: ({ input }) => ({ count: input.start }))
);
```

- Works like a Redux reducer
- Snapshot is available via `.context` property

### `fromObservable<TContext, TInput>`

```typescript
import { interval } from 'rxjs';

const ticker = fromObservable(({ input }) => interval(input.ms));
```

- Cannot receive events
- Observable values become snapshot context

### `fromEventObservable<TEvent, TInput>`

```typescript
import { fromEvent } from 'rxjs';

const clicks = fromEventObservable(() =>
  fromEvent(document.body, 'click') as Subscribable<EventObject>
);
```

- Emitted values are automatically forwarded as events to the parent actor
- Do not use `onDone`/`onSnapshot` with event observables

---

## Invoke (Invoking Actors)

Invoked actors start when a state is entered and stop when the state is exited.

```typescript
states: {
  loading: {
    invoke: {
      id: 'fetchData',                           // unique ID within parent
      src: 'fetchUser',                            // references setup actors
      input: ({ context }) => ({ userId: context.userId }),
      onDone: {
        target: 'success',
        actions: assign({ user: ({ event }) => event.output }),
      },
      onError: {
        target: 'failure',
        actions: assign({ error: ({ event }) => event.error }),
      },
      onSnapshot: {                                // intermediate updates
        actions: ({ event }) => console.log(event.snapshot),
      },
      systemId: 'globalFetcher',                   // system-wide unique ID
    },
  },
}
```

### Multiple Parallel Invocations

```typescript
invoke: [
  { id: 'checkTires', src: 'tirePressure' },
  { id: 'checkOil', src: 'oilPressure' },
]
```

### Root-Level Invocation (active for machine lifetime)

```typescript
createMachine({
  invoke: { src: fromEventObservable(() => fromEvent(document, 'keydown')) },
  on: { keydown: { /* ... */ } },
})
```

### Accessing Invoked Actors

```typescript
const snapshot = actor.getSnapshot();
const child = snapshot.children['fetchData'];
child.send({ type: 'cancel' });
child.getSnapshot();
```

---

## Spawn (Spawning Actors)

Spawned actors persist independently across state boundaries. Must be stopped manually.

### `spawnChild` (no context reference needed)

```typescript
entry: spawnChild(childMachine, { id: 'worker', input: { mode: 'fast' } })
```

### `spawn` inside `assign` (stores reference in context)

```typescript
entry: assign({
  workerRef: ({ spawn }) => spawn(childMachine, {
    id: 'worker',
    input: { mode: 'fast' },
    systemId: 'main-worker',
  }),
})
```

### Stopping Spawned Actors

```typescript
actions: [
  stopChild('worker'),
  assign({ workerRef: undefined }),  // remove from context to prevent memory leaks
]
```

### Invoke vs Spawn

| | Invoke | Spawn |
|---|--------|-------|
| Lifecycle | Tied to state (auto-start/stop) | Independent (manual stop) |
| `onDone`/`onError` | Supported | Not supported |
| Use case | State-scoped async work | Long-lived or dynamic actors |

---

## Parallel States

All child regions are simultaneously active.

```typescript
const machine = createMachine({
  type: 'parallel',
  states: {
    playback: {
      initial: 'paused',
      states: {
        paused: { on: { PLAY: 'playing' } },
        playing: { on: { PAUSE: 'paused' } },
      },
    },
    volume: {
      initial: 'normal',
      states: {
        normal: { on: { MUTE: 'muted' } },
        muted: { on: { UNMUTE: 'normal' } },
      },
    },
  },
});

// State value is an object:
// { playback: 'paused', volume: 'normal' }
```

- Events are broadcast to all regions concurrently
- `onDone` triggers when ALL regions reach final states
- Multiple targets: `target: ['.mode.dark', '.theme.custom']`

---

## Final States

```typescript
states: {
  done: { type: 'final' },
}

// Machine output (computed when final state is reached)
output: ({ context }) => ({ total: context.total })
```

- Machine cannot receive events after reaching a final state
- All running child processes are canceled and cleaned up
- Child final state triggers parent's `onDone`
- In parallel states: ALL regions must reach final states

---

## History States

Remember the last active child state before parent exit.

```typescript
states: {
  payment: {
    initial: 'card',
    states: {
      card: {},
      paypal: {},
      hist: { type: 'history' },                    // shallow (default)
      deepHist: { type: 'history', history: 'deep' }, // deep
    },
  },
  review: {
    on: {
      back: { target: 'payment.hist' },  // returns to last active payment method
    },
  },
}
```

- **Shallow**: remembers immediate child's last state
- **Deep**: remembers deepest active descendant
- `target` property: fallback if parent was never previously visited

---

## Tags

```typescript
setup({
  types: { tags: 'loading' | 'error' | 'success' },
}).createMachine({
  states: {
    fetching: { tags: ['loading'] },
    failed: { tags: ['error'] },
    done: { tags: ['success'] },
  },
})

// Query
snapshot.hasTag('loading'); // boolean — type-safe with setup()
```

Prefer `hasTag()` over `matches()` for resilience to state structure changes.

---

## Actor System & `systemId`

Every `createActor()` call creates a system with the actor as root. Child actors join the same system.

### Receptionist Pattern (cross-actor communication)

```typescript
// Register with systemId
invoke: { src: notifierMachine, systemId: 'notifier' }

// Access from anywhere in the system
actions: sendTo(
  ({ system }) => system.get('notifier'),
  { type: 'notify', message: 'Update!' }
)
```

---

## `machine.provide()` — Override Implementations

```typescript
const testMachine = machine.provide({
  actions: { track: () => { /* mock */ } },
  guards: { isValid: () => true },
  actors: { fetchUser: fromPromise(async () => mockUser) },
  delays: { timeout: 0 },
});

const actor = createActor(testMachine).start();
```

---

## Persistence & Rehydration

```typescript
// Persist
const persisted = actor.getPersistedSnapshot();
localStorage.setItem('state', JSON.stringify(persisted));

// Restore
const snapshot = JSON.parse(localStorage.getItem('state'));
const restoredActor = createActor(machine, { snapshot }).start();
```

- `getPersistedSnapshot()` recursively persists child actors
- Actions already executed will NOT replay after restoration
- State must be JSON-serializable

---

## Inspection API

```typescript
const actor = createActor(machine, {
  inspect: (event) => {
    switch (event.type) {
      case '@xstate.actor':     // actor created
      case '@xstate.event':     // event sent to actor
      case '@xstate.snapshot':  // snapshot updated
      case '@xstate.microstep': // individual state transition (including transient)
    }
  },
});
```

Use `@xstate.microstep` to observe transient states that `subscribe()` skips.

---

## Testing

```typescript
import { createActor, SimulatedClock } from 'xstate';

// Basic pattern: Arrange, Act, Assert
const actor = createActor(machine, { input: { ... } });
actor.start();
actor.send({ type: 'submit' });
expect(actor.getSnapshot().value).toBe('submitting');
expect(actor.getSnapshot().context.count).toBe(1);
expect(actor.getSnapshot().matches('submitting')).toBe(true);
expect(actor.getSnapshot().hasTag('loading')).toBe(true);
expect(actor.getSnapshot().can({ type: 'cancel' })).toBe(true);

// Mock implementations via .provide()
const testActor = createActor(
  machine.provide({
    actions: { track: vi.fn() },
    actors: { fetchData: fromPromise(async () => mockData) },
  })
);

// Simulated clock for delayed transitions
const clock = new SimulatedClock();
const actor = createActor(machine, { clock });
actor.start();
clock.increment(5000); // advance 5 seconds

// Pure transition functions (no side effects)
import { transition, initialTransition } from 'xstate';

const [initialState, initialActions] = initialTransition(machine);
const [nextState, actions] = transition(machine, initialState, { type: 'submit' });
```

### `waitFor()` and `toPromise()`

```typescript
import { waitFor, toPromise } from 'xstate';

// Wait for a specific condition
const snapshot = await waitFor(
  actor,
  (s) => s.matches('done'),
  { timeout: 10_000 }
);

// Wait for actor completion
const output = await toPromise(actor);
```

---

## TypeScript Utilities

| Utility | Purpose |
|---------|---------|
| `ActorRefFrom<typeof machine>` | Extract `ActorRef` type from actor logic |
| `SnapshotFrom<typeof machine>` | Extract snapshot type |
| `EventFromLogic<typeof machine>` | Extract union of all event types |
| `OutputFrom<typeof machine>` | Extract output type |

### `assertEvent()`

Narrows event type in contexts where it isn't known (e.g., entry actions).

```typescript
import { assertEvent } from 'xstate';

entry: ({ event }) => {
  assertEvent(event, 'userLoggedIn');   // throws if wrong type
  console.log(event.userId);            // now typed correctly
}

// Multiple types
exit: ({ event }) => {
  assertEvent(event, ['greet', 'log']);
  console.log(event.message);           // union of greet | log
}
```

---

## Complete Example: Feedback Form

```typescript
import { setup, assign, fromPromise, createActor } from 'xstate';

const submitFeedback = fromPromise<void, { feedback: string; rating: number }>(
  async ({ input }) => {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Submission failed');
  }
);

const feedbackMachine = setup({
  types: {
    context: {} as {
      feedback: string;
      rating: number;
      error: string | null;
    },
    events: {} as
      | { type: 'feedback.good' }
      | { type: 'feedback.bad' }
      | { type: 'feedback.update'; value: string }
      | { type: 'rating.update'; value: number }
      | { type: 'submit' }
      | { type: 'retry' }
      | { type: 'back' },
    tags: 'form' | 'submitting' | 'done' | 'error',
  },
  actors: { submitFeedback },
  guards: {
    isValid: ({ context }) =>
      context.feedback.length > 0 && context.rating >= 1 && context.rating <= 5,
  },
}).createMachine({
  id: 'feedback',
  initial: 'prompt',
  context: { feedback: '', rating: 5, error: null },
  states: {
    prompt: {
      on: {
        'feedback.good': 'thanks',
        'feedback.bad': 'form',
      },
    },
    form: {
      tags: ['form'],
      on: {
        'feedback.update': {
          actions: assign({ feedback: ({ event }) => event.value }),
        },
        'rating.update': {
          actions: assign({ rating: ({ event }) => event.value }),
        },
        submit: { guard: 'isValid', target: 'submitting' },
        back: 'prompt',
      },
    },
    submitting: {
      tags: ['submitting'],
      invoke: {
        src: 'submitFeedback',
        input: ({ context }) => ({
          feedback: context.feedback,
          rating: context.rating,
        }),
        onDone: 'thanks',
        onError: {
          target: 'error',
          actions: assign({ error: ({ event }) => String(event.error) }),
        },
      },
    },
    error: {
      tags: ['error'],
      on: {
        retry: { target: 'submitting', actions: assign({ error: null }) },
        back: 'form',
      },
    },
    thanks: { type: 'final', tags: ['done'] },
  },
});

const actor = createActor(feedbackMachine).start();
actor.subscribe((snapshot) => {
  console.log('State:', snapshot.value);
  console.log('Context:', snapshot.context);
  console.log('Is form?', snapshot.hasTag('form'));
});
```

---

## Gotchas & Common Mistakes

- **Events are objects, not strings**: `actor.send({ type: 'event' })` not `actor.send('event')`
- **Never mutate context**: always use `assign()`
- **`assign()` is declarative**: use it directly as an action, not inside a function
- **Transitions are internal by default** (v4 was external) — use `reenter: true` for external
- **`subscribe()` doesn't emit current snapshot** — use `getSnapshot()` for initial state
- **Callback actors cannot be `async`** — use `.then()` internally
- **Promise actors cannot receive events**
- **Stopped actors disappear from `snapshot.children`**
- **`state.output` is undefined until `status === 'done'`**
- **Lazy context** (`context: () => ({})`) creates separate instances per actor; static context shares the reference
- **Guards are synchronous** — no async, no side effects
- **Delayed actions need an `id` to be cancellable**
- **Always-transition infinite loops**: must have `guard` when no `target`, and `target` must differ from current state
- **Transient states skip `subscribe()`** — use inspection API for observability
- **`spawnChild` does not return a reference** — use `spawn` inside `assign` when you need the ref
- **Stopping a child does not remove it from context** — also `assign` it to `undefined`
