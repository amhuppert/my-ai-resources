# TypeScript Standards

## TypeScript Configuration

### Strict Mode Settings

Enable strict TypeScript compiler options for maximum type safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  }
}
```

**Key Benefits:**
- `noUncheckedIndexedAccess`: Forces handling of potentially undefined values from array/object access
- `exactOptionalPropertyTypes`: Distinguishes between undefined and missing properties
- `noPropertyAccessFromIndexSignature`: Requires bracket notation for index signature access

## Type Safety

### Never Use `any`

**NEVER use the `any` type** - it defeats TypeScript's purpose and eliminates type safety.

```typescript
// ❌ DON'T
function processData(data: any) {
  return data.value;
}

// ✅ DO: Use proper types
function processData(data: { value: string }) {
  return data.value;
}

// ✅ DO: Use unknown for truly unknown types, then narrow
function processData(data: unknown) {
  if (typeof data === "object" && data !== null && "value" in data) {
    return (data as { value: string }).value;
  }
  throw new Error("Invalid data");
}
```

### Avoid Type Assertions

Minimize use of type assertions (the `as` keyword), especially `as any`.

```typescript
// ❌ DON'T: Type assertion bypasses type checking
const data = JSON.parse(json) as MyType;

// ✅ DO: Use runtime validation (e.g., Zod)
const data = MyTypeSchema.parse(JSON.parse(json));
```

**When type assertions are acceptable:**
- Asserting nominal types after validation
- Narrowing types when you have runtime knowledge TypeScript can't infer

## Nominal Types

Use nominal types to prevent accidental mixing of semantically different values that share the same underlying type.

### Using @coderspirit/nominal

```typescript
import { WithFlavor } from "@coderspirit/nominal";

// Create nominal types for IDs
export type UserID = WithFlavor<string, "UserID">;
export type QuizID = WithFlavor<string, "QuizID">;
export type QuestionID = WithFlavor<string, "QuestionID">;

// Create nominal types for semantic strings
export type MarkdownText = WithFlavor<string, "MarkdownText">;
export type HtmlText = WithFlavor<string, "HtmlText">;

// TypeScript now prevents mixing these types
function getUser(userId: UserID) { /* ... */ }
function getQuiz(quizId: QuizID) { /* ... */ }

const userId: UserID = "user_123" as UserID;
const quizId: QuizID = "quiz_456" as QuizID;

getUser(userId);    // ✅ OK
getUser(quizId);    // ❌ Type error - prevents bugs
```

### When to Use Nominal Types

**Use nominal types for:**
- Entity IDs (UserID, QuizID, etc.)
- Semantic strings with special meaning (MarkdownText, HtmlText, EmailAddress, etc.)
- Values that should never be mixed despite having the same underlying type

**Don't use nominal types for:**
- Regular display text and labels
- Generic string values without special semantic meaning
- Values where mixing is actually valid

## Discriminated Unions

Use discriminated unions with a literal `type` field for variant types:

```typescript
// ✅ DO: Define individual types, then create union
export type StartEvent = {
  type: "START";
};

export type StopEvent = {
  type: "STOP";
  reason: string;
};

export type Event = StartEvent | StopEvent;

// Usage with type narrowing
function handleEvent(event: Event) {
  if (event.type === "START") {
    // TypeScript knows: event is StartEvent
  } else {
    // TypeScript knows: event is StopEvent
    console.log(event.reason);
  }
}
```

## Runtime Validation with Zod

Use Zod for runtime validation, especially for external data:

```typescript
import { z } from "zod";

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

// Infer TypeScript type from schema
export type User = z.infer<typeof UserSchema>;

// Validate external data
function loadUser(data: unknown): User {
  return UserSchema.parse(data); // Throws if invalid
}
```

### Zod with Nominal Types

```typescript
import { z } from "zod";
import { WithFlavor } from "@coderspirit/nominal";

export type QuestionID = WithFlavor<string, "QuestionID">;

const QuestionIDSchema = z
  .string()
  .uuid()
  .transform((id): QuestionID => id as QuestionID);

const QuestionSchema = z.object({
  id: QuestionIDSchema,
  text: z.string(),
});

export type Question = z.infer<typeof QuestionSchema>;
```

## Functions vs Classes

### Prefer Factory Functions

Use factory functions returning plain objects instead of classes:

```typescript
// ✅ DO: Factory function
export function createQuizService(): QuizService {
  // Private functions (closure scope)
  function loadData() {
    // ...
  }

  // Return object matching interface
  return {
    async createQuiz(): Promise<Quiz> {
      const data = loadData();
      // ...
    },

    async submitQuiz(answers: QuizAnswers): Promise<GradedQuiz> {
      // ...
    },
  };
}

// ❌ DON'T: Class (unless you have a specific reason)
class QuizService {
  private loadData() {
    // ...
  }

  async createQuiz(): Promise<Quiz> {
    // ...
  }
}
```

## Type Narrowing

### Optional Chaining and Nullish Coalescing

Use optional chaining (`?.`) and nullish coalescing (`??`) for safe property access:

```typescript
// ✅ DO: Optional chaining
const userName = user?.profile?.name;

// ✅ DO: Nullish coalescing for defaults
const displayName = user?.name ?? "Anonymous";

// ✅ DO: Combine both
const email = user?.contact?.email ?? "no-email@example.com";

// ❌ DON'T: Manual null checks (when optional chaining suffices)
const userName = user && user.profile && user.profile.name;
```