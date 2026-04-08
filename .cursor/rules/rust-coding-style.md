---
paths:
 - "**/*.rs"
---
# Rust Coding Style

> This file extends common/coding-style.md with Rust-specific content.

## Formatting

- Run `cargo fmt` before every commit
- Run `cargo clippy -- -D warnings` (treat warnings as errors)
- 4-space indent; max line width 100 characters

## Immutability

- Use `let` by default; only `let mut` when mutation is required
- Prefer returning new values over mutating in place

## Naming

- `snake_case` — functions, methods, variables, modules
- `PascalCase` — types, traits, enums, type parameters
- `SCREAMING_SNAKE_CASE` — constants and statics

## Ownership and Borrowing

- Borrow (`&T`) by default; take ownership only when storing or consuming
- Accept `&str` over `String`, `&[T]` over `Vec<T>` in function parameters
- Never clone to satisfy the borrow checker without understanding the root cause

## Error Handling

- Use `Result<T, E>` and `?` for propagation — never `unwrap()` in production
- Use `thiserror` for library errors, `anyhow` for application errors
- Add context with `.with_context(|| format!("failed to ..."))?`
- Reserve `unwrap()` / `expect()` for tests and truly unreachable states

```rust
use anyhow::Context;

fn load_config(path: &str) -> anyhow::Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read {path}"))?;
    toml::from_str(&content)
        .with_context(|| format!("failed to parse {path}"))
}
```

## Iterators Over Loops

Prefer iterator chains for transformations; use loops for complex control flow.

## Unsafe Code

- Minimize `unsafe` blocks — prefer safe abstractions
- Every `unsafe` block must have a `// SAFETY:` comment explaining the invariant
