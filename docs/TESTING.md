# Testing

Sift uses automated tests suitable for a product moving toward **production use in professional environments**: fast unit/API tests on every change, plus a **GitHub Actions** workflow on push and pull requests.

## What runs where

| Layer | Stack | Scope |
| ------- | ------- | ------- |
| **Backend** | Jest + Supertest | HTTP API (`createApp`), in-memory SQLite, FHIR/HL7 pipeline units; LLM mocked via `fetch` |
| **Frontend** | Vitest + jsdom | API client (`fetch` mocked), Tauri runtime helper |
| **Tauri host** | `cargo check` (CI) | Compiles Rust; full UI/driver tests are a later increment |

## Commands

From the **repository root**:

```bash
npm test
```

Runs backend tests, then frontend tests.

### Backend only

```bash
cd backend
npm test              # Jest with coverage report
npm run test:watch    # Jest watch mode
```

### Frontend only

```bash
cd frontend
npm test              # vitest run
npm run test:watch    # vitest interactive
```

### Typecheck (backend)

```bash
npm run lint:backend
```

## GitHub Actions

Workflow file: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

Jobs:

1. **Backend** — `npm ci`, `tsc --noEmit`, `npm test`
2. **Frontend** — `npm ci`, `npm test`, `npm run build`
3. **Tauri host** — Linux WebKit/GTK deps, `cargo check --locked` in `src-tauri/`

Enable Actions in the GitHub repo settings if required. Commit **package-lock.json** files so `npm ci` is reproducible.

## Production / release checks

- Run the full CI matrix locally where possible (`npm test`, `npm run build --prefix frontend`, `cargo check` in `src-tauri`).
- Manual smoke: [Development](DEVELOPMENT.md) — `npm run dev`, ingest a sample file, confirm a document row.

## Roadmap

- Raise coverage on `ingest.ts`, `pdf.ts`, and `llm.ts` (fixtures for PDF, LLM error paths).
- React Testing Library for **Settings** and **Documents** flows with mocked `fetch` / Tauri APIs.
- Optional: Windows runner job for `tauri build` on release tags (slower; use `cross-env CI=false` where documented).

## Related docs

- [Development](DEVELOPMENT.md)
- [Troubleshooting](TROUBLESHOOTING.md)
