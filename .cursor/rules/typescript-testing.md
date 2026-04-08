---
paths:
 - "**/*.ts"
 - "**/*.tsx"
 - "**/*.js"
 - "**/*.jsx"
---
# TypeScript/JavaScript Testing

> This file extends common/testing.md with TypeScript/JavaScript specific content.

## Stack

- **Backend unit/integration**: Jest + ts-jest + supertest
- **Frontend unit/component**: Vitest + @testing-library/react + jsdom
- **E2E**: Playwright for critical user flows (future)

## Test Structure (AAA Pattern)

```typescript
test('returns processed document when LLM succeeds', async () => {
  // Arrange
  const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  vi.stubGlobal('fetch', mockFetch)

  // Act
  const result = await ingestFile(db, '/path/to/file.json')

  // Assert
  expect(result.status).toBe('complete')
})
```

## Test Naming

Use descriptive names that explain the behavior under test:

```typescript
test('falls back to heuristic summary when LLM is unavailable', () => {})
test('throws when file does not exist', () => {})
test('returns 404 when document id is unknown', () => {})
```

## Mocking

- Use `vi.stubGlobal` / `jest.fn()` for `fetch` — never make real network calls in tests
- Use in-memory SQLite (`openMemoryDatabase()`) for backend integration tests
- Clean up mocks and DOM state in `afterEach`

## Coverage

- Minimum 80% coverage across statements, branches, and functions
- Run with `--coverage` flag; upload artifacts in CI
