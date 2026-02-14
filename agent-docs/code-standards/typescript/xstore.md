# XState Store Standards

## Documentation

Review web documentation as needed:

- [XState Store Documentation](https://stately.ai/docs/xstate-store)
- [XState Store Project README](https://github.com/statelyai/xstate/tree/main/packages/xstate-store)

## File Organization

### File Naming

- Use `{feature}.store.tsx` for store files (e.g., `quiz.store.tsx`, `user.store.tsx`)
- Create only one file per store
- Include the React provider and hook in the same file

## Type Naming Conventions

### State Type

Name the store's state type: `{Feature}State`

Note: We use "State" instead of "Context" to avoid confusion with React Context.

```typescript
export type QuizState = {
  status: "idle" | "loading" | "active" | "completed" | "error";
  quiz: Quiz | null;
  currentQuestionIndex: number;
  answers: QuizAnswers;
  error: string | null;
};
```

### Individual Event Types

Name each event type in PascalCase with an "Event" suffix:

**Important**: The `type` field value must be in camelCase with no hyphens to work with the `trigger` API.

```typescript
export type StartQuizEvent = { type: "startQuiz" };
export type AnswerQuestionEvent = {
  type: "answerQuestion";
  questionId: QuestionID;
  answer: string[];
};
export type SubmitQuizEvent = { type: "submitQuiz" };
export type ResetQuizEvent = { type: "resetQuiz" };
```

### Event Union Type

Name the union of all event types: `{Feature}Events`

```typescript
export type QuizEvents =
  | StartQuizEvent
  | AnswerQuestionEvent
  | SubmitQuizEvent
  | ResetQuizEvent;
```

### Store Type

Name the store type: `{Feature}Store`

Export using `ReturnType<typeof create{Feature}Store>`:

```typescript
export function createQuizStore(quizService: QuizService) {
  const store = createStore({
    context: {
      status: "idle",
      quiz: null,
      currentQuestionIndex: 0,
      answers: {},
      error: null,
    } as QuizState,
    on: {
      startQuiz: (context, _event, enqueue) => {
        return { ...context, status: "loading" as const };
      },
    },
  });
  return store;
}

export type QuizStore = ReturnType<typeof createQuizStore>;
```

## Type Definitions Pattern

### Factory Function

Define a store factory function that takes all dependencies as arguments:

```typescript
export function createQuizStore(quizService: QuizService) {
  const store = createStore({
    context: {
      status: "idle",
      quiz: null,
      answers: {},
    } as QuizState,
    on: {
      startQuiz: (context, _event) => ({
        ...context,
        status: "loading" as const,
      }),
    },
  });
  return store;
}
```

### Event Handler Signatures

Use the specific named event type (not the union type) for event handler parameters:

```typescript
startQuiz: (context, event: StartQuizEvent) => {
  return {
    ...context,
    status: "loading" as const,
  };
},

answerQuestion: (context, event: AnswerQuestionEvent) => {
  return {
    ...context,
    answers: {
      ...context.answers,
      [event.questionId]: event.answer,
    },
  };
},
```

## Sending Events

### Using the Trigger API

Use `store.trigger.eventName({ ...payload })` to send events. The trigger API provides type-safe method calls where you pass the event payload without the `type` field:

```typescript
// Simple event with no payload
store.trigger.startQuiz();

// Event with payload (type field is omitted)
store.trigger.answerQuestion({
  questionId: "q1" as QuestionID,
  answer: ["option1"],
});
```

### Type Assertions

Cast initial context as `{Feature}State`:

```typescript
context: {
  status: "idle",
  quiz: null,
  answers: {},
} as QuizState,
```

## Type Safety

- **Never use the `any` type** - it defeats TypeScript's purpose and eliminates type safety
- Define individual types for discriminated union members instead of inline definitions
- This avoids needing `Extract<>` utility and makes types more explicit and reusable

## Complete Example

```typescript
import { createStore } from "@xstate/store";

export type QuizState = {
  status: "idle" | "loading" | "active" | "completed";
  quiz: Quiz | null;
  answers: QuizAnswers;
};

export type StartQuizEvent = { type: "startQuiz" };
export type StartQuizSuccessEvent = { type: "startQuizSuccess"; quiz: Quiz };
export type AnswerQuestionEvent = {
  type: "answerQuestion";
  questionId: QuestionID;
  answer: string[];
};
export type SubmitQuizEvent = { type: "submitQuiz" };

export type QuizEvents =
  | StartQuizEvent
  | StartQuizSuccessEvent
  | AnswerQuestionEvent
  | SubmitQuizEvent;

export function createQuizStore(quizService: QuizService) {
  const store = createStore({
    context: {
      status: "idle",
      quiz: null,
      answers: {},
    } as QuizState,
    on: {
      startQuiz: (context, _event, enqueue) => {
        enqueue.effect(async () => {
          const quiz = await quizService.createQuiz();
          store.trigger.startQuizSuccess({ quiz });
        });
        return { ...context, status: "loading" as const };
      },

      startQuizSuccess: (context, event: StartQuizSuccessEvent) => {
        return {
          ...context,
          status: "active" as const,
          quiz: event.quiz,
        };
      },

      answerQuestion: (context, event: AnswerQuestionEvent) => {
        return {
          ...context,
          answers: {
            ...context.answers,
            [event.questionId]: event.answer,
          },
        };
      },

      submitQuiz: (context) => {
        return { ...context, status: "completed" as const };
      },
    },
  });
  return store;
}

export type QuizStore = ReturnType<typeof createQuizStore>;

const { quizStore } = useQuizStore();

quizStore.trigger.startQuiz();
quizStore.trigger.answerQuestion({
  questionId: "q1" as QuestionID,
  answer: ["option1"],
});
```
