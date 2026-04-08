# Testing Requirements

## Minimum Test Coverage: 80%

Test Types (ALL required):

1. **Unit Tests** — individual functions, utilities, components
2. **Integration Tests** — API endpoints, database operations
3. **E2E Tests** — critical user flows (Playwright, future)

## Test-Driven Development

Preferred workflow:

1. Write test first (RED)
2. Run test — it should FAIL
3. Write minimal implementation (GREEN)
4. Run test — it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Test Structure (AAA Pattern)

```typescript
test('calculates similarity correctly', () => {
  // Arrange
  const vector1 = [1, 0, 0]
  const vector2 = [0, 1, 0]

  // Act
  const similarity = calculateCosineSimilarity(vector1, vector2)

  // Assert
  expect(similarity).toBe(0)
})
```

## Test Naming

Use descriptive names that explain the behavior under test:

```typescript
test('returns empty array when no documents match query', () => {})
test('throws error when file does not exist', () => {})
test('falls back to heuristic when LLM is unavailable', () => {})
```
