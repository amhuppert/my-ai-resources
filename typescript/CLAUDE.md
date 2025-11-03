# typescript/CLAUDE.md

## Type Safety Rules

- Avoid using `any`
- Avoid using `!` syntax to bypass null checks
- Avoid unsafe type assertions

## Testing Standards

### Running Tests

```bash
# Run all tests
bun test

# Run tests with AI-friendly output
AGENT=1 bun test

# Run unit tests only
bun test lib/ scripts/

# Run tests in watch mode
bun test --watch
```

### Test Organization

- **Co-located Unit Tests**: Place test files next to the source files they test
  - Example: `lib/installer-utils.ts` → `lib/installer-utils.test.ts`
  - Example: `scripts/install-settings.ts` → `scripts/install-settings.test.ts`

- **Integration Tests**: Place in `tests/integration/` directory (when needed)

### Testing Approach

**Pure Functions** - Test without mocks using real APIs:

**Functions with External Dependencies** - Mock only when necessary:

- Mock `CommandExecutor` for testing command execution
- Use real filesystem operations with temp directories
- Only mock external APIs when there's a good reason (not automatic)

### Dependency Injection

Code uses minimal DI for testability:

- `InstallConfig` - Configuration for paths and commands
- `CommandExecutor` - Interface for executing shell commands

**Important Design Pattern:**

- Config and executor are initialized ONCE at the application entry point
- They are passed down through the call stack as required parameters (no defaults)
- This makes dependencies explicit and prevents hidden object creation
- Entry points (CLI handlers, main functions) create dependencies and pass them down

### Test File Structure

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";

describe("Feature name", () => {
  test("does something specific", () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(...);
  });
});
```

### Mock Implementations

Use `MockCommandExecutor` for testing command execution:

```typescript
class MockCommandExecutor implements CommandExecutor {
  calls: Array<{ command: string; args: string[]; options?: any }> = [];

  setResult(command: string, args: string[], result: CommandResult) {
    // Set expected result for command
  }
}
```

### Temporary Directories

Use unique temp directories for each test:

```typescript
beforeEach(() => {
  tempDir = join(tmpdir(), `test-${Date.now()}-${Math.random()}`);
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
```
