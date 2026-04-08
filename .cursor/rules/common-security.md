# Security Guidelines

## Mandatory Security Checks

Before ANY commit:

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries only)
- [ ] XSS prevention (sanitized HTML)
- [ ] Authentication/authorization verified
- [ ] Error messages don't leak sensitive data (paths, stack traces, DB errors)

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Patient Data (HIPAA Context)

- Medical record content must never be logged at DEBUG level in production
- File paths containing patient identifiers must not appear in error responses
- SQLite database file must not be stored in a world-readable location
- LLM summaries are derived data — treat with same sensitivity as source records

## Security Response Protocol

If a security issue is found:

1. STOP immediately
2. Fix CRITICAL issues before continuing
3. Rotate any exposed secrets
4. Review the entire codebase for similar issues
