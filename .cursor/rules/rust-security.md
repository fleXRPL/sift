---
paths:
 - "**/*.rs"
---
# Rust Security

> This file extends common/security.md with Rust-specific content.

## Secrets Management

- Never hardcode API keys, tokens, or credentials in source code
- Use environment variables: `std::env::var("API_KEY")`
- Fail fast if required secrets are missing at startup

```rust
// BAD
const API_KEY: &str = "sk-abc123...";

// GOOD
fn load_api_key() -> anyhow::Result<String> {
    std::env::var("PAYMENT_API_KEY")
        .context("PAYMENT_API_KEY must be set")
}
```

## SQL Injection Prevention

- Always use parameterized queries — never format user input into SQL strings
- With `rusqlite` / `better-sqlite3`, always use `?` placeholders and `.bind()`

## Input Validation

- Validate all user input at system boundaries before processing
- Use the type system to enforce invariants (newtype pattern)
- Parse, don't validate — convert unstructured data to typed structs at the boundary

## Dependency Security

```bash
cargo audit          # scan for known CVEs
cargo deny check     # license and advisory compliance
cargo tree -d        # inspect duplicate transitive deps
```

## Error Messages

- Never expose internal paths, stack traces, or DB errors in API responses
- Log detailed errors server-side with `tracing`; return generic messages to clients
