# Testing

Sift uses automated tests suitable for a product moving toward **production use in
professional environments**: fast unit and API tests on every change, plus a
**GitHub Actions** CI workflow on every push and pull request.

## Test inventory

| Suite | File(s) | Count | What is verified |
| ----- | ------- | ----- | ---------------- |
| Backend API | `backend/src/__tests__/app.test.ts` | 13 | All HTTP endpoints: `GET /health`, settings CRUD, `POST /api/ingest`, `GET /api/documents`, `GET /api/documents/:id`, `DELETE /api/documents/:id`, `POST /api/scan` |
| Backend ingest | `backend/src/__tests__/ingest.test.ts` | 5 | LLM success path, LLM fallback (heuristic summary + `error_message`), file-not-found, directory rejection, `raw_preview` truncation |
| FHIR pipeline | `backend/src/pipelines/__tests__/fhir.test.ts` | 2 | Invalid JSON handling, patient name extraction from Bundle |
| HL7 pipeline | `backend/src/pipelines/__tests__/hl7.test.ts` | 3 | `looksLikeHl7` detection, segment parsing, PID extraction |
| Frontend API client | `frontend/src/api.test.ts` | 8 | All `api.*` methods (health, getSettings, saveSettings, listDocuments, getDocument, ingestPath, deleteDocument), error propagation |
| Markdown renderer | `frontend/src/MarkdownText.test.tsx` | 15 | Bold, italic, h1/h2/h3 headings, `*`/`-` unordered lists, `1.` ordered lists, blank-line list flushing, inline bold inside list items, realistic LLM synthesis output |
| Tauri runtime helper | `frontend/src/tauri-env.test.ts` | 1 | `isTauriRuntime()` returns `false` in jsdom |
| **Total** | | **47** | |

## Stack

| Layer | Framework | Notes |
| ----- | --------- | ----- |
| Backend | Jest 29 + `ts-jest` + Supertest | In-memory SQLite (`openMemoryDatabase()`); LLM mocked via `jest.fn()` on `global.fetch` |
| Frontend | Vitest 3 + jsdom + `@testing-library/react` | `fetch` mocked with `vi.stubGlobal`; Tauri APIs not available in jsdom |
| Tauri host | `cargo check` (CI only) | Verifies Rust compiles; full driver/UI tests are a later increment |

## Running tests

### Everything at once (from repo root)

```bash
npm test
```

Runs backend Jest, then frontend Vitest.

### Backend only

```bash
cd backend
npm test              # Jest + coverage + --forceExit
npm run test:watch    # Jest watch mode
```

### Frontend only

```bash
cd frontend
npm test              # vitest run
npm run test:watch    # vitest interactive
```

### Typecheck (no test run)

```bash
# Backend
cd backend && npx tsc -p tsconfig.build.json --noEmit

# Frontend
cd frontend && npx tsc --noEmit

# Or via root shortcut
npm run lint:backend
```

## GitHub Actions CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Three parallel jobs run on every push and pull request:

| Job | Steps |
| --- | ----- |
| **Backend** | `npm ci` → `tsc --noEmit` → `jest --coverage --forceExit` → upload `backend/coverage/` artifact (14 days) |
| **Frontend** | `npm ci` → `tsc --noEmit` → `vitest --coverage` → upload `frontend/coverage/` artifact (14 days) → `vite build` |
| **Tauri host** | Install Linux WebKit/GTK deps → `dtolnay/rust-toolchain@stable` → `cargo check --locked` |

Coverage artifacts are available as downloadable zip files from the **Actions** tab on
any completed workflow run.

> **Note:** Commit `package-lock.json` files for both `backend/` and `frontend/` so
> `npm ci` is reproducible in CI.

## Adding new tests

- **Backend endpoint** → add a case in `backend/src/__tests__/app.test.ts` using the
  existing `createApp(db)` + `openMemoryDatabase()` pattern.
- **Ingest path** → add to `backend/src/__tests__/ingest.test.ts`; mock `global.fetch`
  for LLM responses.
- **Pipeline** → add to `backend/src/pipelines/__tests__/<name>.test.ts`.
- **Frontend component** → add a `*.test.tsx` file alongside the component; use
  `render()` + `cleanup()` from `@testing-library/react` and query within the returned
  `container`, not `document`, to avoid cross-test contamination.
- **Frontend API method** → add a case in `frontend/src/api.test.ts` following the
  `vi.stubGlobal("fetch", mockFetch(...))` pattern.

## Roadmap

- Raise coverage on `pdf.ts` (PDF fixture) and `llm.ts` (timeout / non-200 error paths).
- React Testing Library component tests for the `SettingsForm` and document delete flow.
- Windows runner job for `tauri build` on release tags (add `cross-env CI=false` as
  documented in [Build and release](BUILD-AND-RELEASE.md)).
- Coverage gate: fail CI if overall coverage drops below a defined threshold.

## Related docs

- [Development](DEVELOPMENT.md)
- [Configuration](CONFIGURATION.md)
- [Troubleshooting](TROUBLESHOOTING.md)
