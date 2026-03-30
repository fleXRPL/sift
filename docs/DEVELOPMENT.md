# Development

How to work on Sift day to day: scripts, processes, ports, and debugging.

## Top-level scripts

From the repository root (`package.json`):

| Script                 | What it does                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Runs **backend** (`ts-node`), **frontend** (Vite on port **1420**), and **`tauri dev`** together via `concurrently`.                          |
| `npm run build`        | Builds frontend (`vite build`), compiles backend TypeScript (`tsc`), then runs **`cross-env CI=false npx tauri build`** for a release bundle. |
| `npm run tauri`        | Pass-through to `@tauri-apps/cli` (for example `npm run tauri -- --help`).                                                                    |
| `npm run lint:backend` | `tsc --noEmit` in `backend/`.                                                                                                                 |
| `npm test`             | Backend Jest + frontend Vitest.                                                                                                               |
| `npm run test:backend` | Jest only (`backend/`).                                                                                                                       |
| `npm run test:frontend`| Vitest only (`frontend/`).                                                                                                                    |

## Package-local scripts

### Frontend (`frontend/package.json`)

- `npm run dev` — Vite dev server, **port 1420**, `strictPort: true`
- `npm run build` — `tsc -b && vite build` → `frontend/dist/`
- `npm test` — Vitest

### Backend (`backend/package.json`)

- `npm run dev` — `ts-node --transpile-only src/index.ts`
- `npm run build` — `tsc -p tsconfig.build.json` → `backend/dist/` (tests excluded)
- `npm test` — Jest + coverage
- `npm run package` — compile + `pkg` to `src-tauri/binaries/` (Windows-oriented; see [Build and release](BUILD-AND-RELEASE.md))

### Tauri (`src-tauri/`)

- Config: `src-tauri/tauri.conf.json`
- Capabilities: `src-tauri/capabilities/default.json`
- Dev URL: `http://localhost:1420` (must match Vite)

## Processes and ports

| Service           | Default bind     | Purpose                                          |
| ----------------- | ---------------- | ------------------------------------------------ |
| Node orchestrator | `127.0.0.1:4000` | REST API, SQLite, ingest                         |
| Vite (dev)        | `localhost:1420` | UI for `tauri dev`                               |
| LLM (optional)    | user-defined     | OpenAI-compatible server, often `127.0.0.1:8080` |

Set `PORT` to change the backend port (see [Configuration](CONFIGURATION.md)).

## Typical workflow

1. `npm run dev`
2. Edit **React** code → hot reload in the webview.
3. Edit **Rust** (`src-tauri/src/`) → Tauri rebuilds; tray and watcher code restarts with the app.
4. Edit **Node** (`backend/src/`) → restart the backend process (stop `npm run dev` and start again), or run the backend in a separate terminal during heavy iteration.

### Run backend only

```bash
cd backend && npm run dev
```

### Run frontend only (browser, limited)

```bash
cd frontend && npm run dev
```

Without Tauri, **folder watch** and **native dialog** are unavailable; the UI can still call `http://127.0.0.1:4000` if the backend runs.

## Environment files

- Backend can use a local `.env` if you add loading (not required by default). Prefer documented env vars in [Configuration](CONFIGURATION.md).
- Frontend: optional `VITE_API_BASE` to point the UI at a non-default API base URL.

## Logging

- **Backend:** logs to stdout (for example `[Sift Orchestrator] http://127.0.0.1:4000`).
- **Rust:** `eprintln!` for watcher and ingest client errors.
- **Tauri:** use `RUST_LOG` if you add `tracing` later; not wired by default.

## Code layout (reminder)

```text
frontend/src/     — React UI, API client
backend/src/      — Express, SQLite, ingest pipelines, LLM client
src-tauri/src/    — Tauri entry, tray, `set_watch_folder`, notify → POST /api/ingest
```

## Related docs

- [Configuration](CONFIGURATION.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Testing](TESTING.md)
