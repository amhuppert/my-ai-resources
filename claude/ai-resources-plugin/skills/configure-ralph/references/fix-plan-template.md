# fix_plan.md Template for Ralph

This template provides the structure and guidelines for creating effective Ralph fix_plan.md files.

## Template

```markdown
# Fix Plan - [Project Name]

## Priority 1: Foundation

<!-- Setup tasks that must complete first:
     - Project initialization
     - Core dependencies
     - Basic structure
     - Configuration files -->

- [ ] [Task 1]
- [ ] [Task 2]

## Priority 2: Core Features

<!-- Main functionality implementation:
     - Primary features users need
     - Core business logic
     - Essential integrations -->

- [ ] [Task 1]
- [ ] [Task 2]

## Priority 3: Integration & Testing

<!-- Connect components and verify:
     - Integration points
     - Test coverage
     - Error handling -->

- [ ] [Task 1]
- [ ] [Task 2]

## Priority 4: Polish

<!-- Final improvements:
     - Documentation
     - Performance optimization
     - UX refinements -->

- [ ] [Task 1]
- [ ] [Task 2]

## Completed

<!-- Items Ralph has finished will be moved here with [x] marks -->

## Discovered

<!-- Ralph adds tasks here during development.
     Review these periodically and reprioritize if needed. -->

## Notes

- [Any relevant context about task dependencies or approach]
```

## Task Writing Guidelines

### Make Tasks Atomic

Each task should be completable in a single Ralph loop iteration (typically 15-30 minutes of work).

- BAD: "Implement user authentication with registration, login, password reset, and session management"
- GOOD: Split into separate tasks:
  - "Implement user registration endpoint (POST /auth/register)"
  - "Implement login endpoint returning JWT (POST /auth/login)"
  - "Implement password reset request endpoint"
  - "Implement password reset confirmation endpoint"

### Be Specific About Endpoints and Files

Include concrete details so Ralph knows exactly what to create.

- BAD: "Add API endpoints"
- GOOD: "Implement GET /api/users endpoint with pagination (limit, offset params)"

### Use Checkbox Format

Always use `- [ ]` format so Ralph can mark tasks complete.

```markdown
- [ ] Create User model with id, email, password_hash, created_at fields
- [x] Set up database connection with connection pooling
```

### Order by Dependency

Earlier tasks should not depend on later tasks. Ralph works top-to-bottom.

```markdown
## Priority 1: Foundation

- [ ] Initialize npm project with TypeScript configuration
- [ ] Set up ESLint and Prettier with project rules
- [ ] Create database schema and run migrations

## Priority 2: Core Features

- [ ] Implement User model (depends on database schema)
- [ ] Create user registration endpoint (depends on User model)
```

### Avoid Compound Tasks

Split "X and Y" into separate items.

- BAD: "Create models and write tests"
- GOOD:
  - "Create User model with validation"
  - "Write unit tests for User model validation"

### Include Verification Tasks

Add explicit tasks for testing and validation.

```markdown
- [ ] Write unit tests for UserService (target 80% coverage)
- [ ] Add integration tests for auth endpoints
- [ ] Verify all endpoints return proper error responses
```

## Priority Level Examples

### Priority 1: Foundation

Tasks that enable all other work:

- Initialize project structure
- Set up build configuration
- Install and configure dependencies
- Create database schemas
- Set up development environment

### Priority 2: Core Features

Primary functionality:

- Implement main endpoints/routes
- Create core business logic
- Build essential UI components
- Set up authentication (if required)
- Implement data models

### Priority 3: Integration & Testing

Connecting and verifying:

- Connect frontend to backend
- Add comprehensive error handling
- Write integration tests
- Set up CI/CD pipeline
- Add logging and monitoring

### Priority 4: Polish

Final refinements:

- Write documentation
- Optimize performance
- Improve error messages
- Add loading states
- Clean up code

## Complete Example

```markdown
# Fix Plan - Task Management API

## Priority 1: Foundation

- [ ] Initialize FastAPI project with proper directory structure (src/, tests/)
- [ ] Configure SQLAlchemy 2.0 with async SQLite connection
- [ ] Create Alembic migration setup
- [ ] Set up pytest with async fixtures
- [ ] Create Task model (id, title, description, status, due_date, created_at)
- [ ] Create initial database migration

## Priority 2: Core Features

- [ ] Implement POST /tasks endpoint for creating tasks
- [ ] Implement GET /tasks endpoint with pagination (limit, offset)
- [ ] Implement GET /tasks/{id} endpoint for single task retrieval
- [ ] Implement PUT /tasks/{id} endpoint for updating tasks
- [ ] Implement DELETE /tasks/{id} endpoint
- [ ] Add filtering by status query parameter to GET /tasks
- [ ] Add sorting by due_date and created_at to GET /tasks

## Priority 3: Integration & Testing

- [ ] Write unit tests for Task CRUD operations (target 80% coverage)
- [ ] Write integration tests for all endpoints
- [ ] Add request validation with descriptive error messages
- [ ] Implement proper HTTP status codes (201 for create, 404 for not found)

## Priority 4: Polish

- [ ] Add OpenAPI documentation with examples for all endpoints
- [ ] Create README with setup instructions and API examples
- [ ] Add health check endpoint (GET /health)
- [ ] Configure structured JSON logging

## Completed

## Discovered

<!-- Ralph will add discovered tasks here -->

## Notes

- Foundation tasks must complete before Core Features
- Use async fixtures in pytest for database tests
```
