# Contributing

Thank you for helping improve Sift. This document is a short contributor guide; expand it as the project grows.

## Principles

- **Focused changes:** Prefer small PRs that fix one issue or add one feature.
- **Match existing style:** TypeScript, Rust, and React patterns should follow the surrounding code.
- **Docs and tests:** Update relevant files under `docs/` when behavior or configuration changes. Add or update tests when you change logic (see [Testing](TESTING.md)).

## Getting set up

Follow [Installation](INSTALLATION.md) and [Development](DEVELOPMENT.md).

## Before you open a PR

1. **Format/lint:** Run project linters when they exist (ESLint/Rustfmt — add as the project matures).
2. **Typecheck:** `npm run lint:backend` from the repo root; frontend `npm run build --prefix frontend` catches TS errors.
3. **Tests:** `npm test` (backend Jest + frontend Vitest). CI runs these on every push/PR.
4. **Manual smoke:** `npm run dev` and confirm the app still opens and the orchestrator shows online.

## Commit messages

Use clear, imperative summaries (for example “Fix ingest path for PDF on Windows”). Link issues when applicable (`Fixes #123`).

## Security

Do not commit secrets, API keys, or patient data. If you find a vulnerability, use the repository’s security reporting process when available.

## Questions

Use GitHub **Discussions** or **Issues** per the repository’s preference once enabled.
