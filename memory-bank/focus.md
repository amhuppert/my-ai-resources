# Current Focus

Create unit tests for the install scripts.

In order to create good tests, we may need to refactor code to use dependency injection and rely on configuration rather than hard-coded values.

## Notes

- Use the built-in `bun` test runner (Jest compatible API)
- Tests must be written in TypeScript
- Refer to documentation to understand how to use the test runner: https://bun.sh/docs/test
- When the agent is running tests, set the `AGENT=1` environment variable to enable AI-friendly output
- After creating the test suite, we must add critical testing information and standards to the CLAUDE.md file.
