---
paths:
 - "**/*.ts"
 - "**/*.tsx"
 - "**/*.js"
 - "**/*.jsx"
---
# TypeScript/JavaScript Security

> This file extends common/security.md with TypeScript/JavaScript specific content.

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

## Input Validation

- Validate all user input at system boundaries with Zod or equivalent
- Never trust file content, API responses, or user-provided paths
- Sanitize paths to prevent directory traversal attacks

## Error Messages

- Never expose internal stack traces or file paths to the UI
- Log detailed errors server-side; return generic messages to clients
