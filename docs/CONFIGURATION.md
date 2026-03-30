# Configuration

Sift configuration comes from **SQLite** (settings and documents), **environment variables** (process-level overrides), and the **in-app Settings** screen.

## Application data directory

By default the Node orchestrator writes:

- **SQLite database:** `data/sift.db` (relative to the current working directory when the backend starts)

In development, that is usually the repo root’s `data/` folder (created automatically).

### `SIFT_DATA_DIR`

Override the directory that contains `sift.db`:

```bash
export SIFT_DATA_DIR=/path/to/writable/dir
```

The process must be able to create the directory and files there.

## Backend HTTP server

| Variable            | Default                         | Description                                 |
| ------------------- | ------------------------------- | ------------------------------------------- |
| `PORT`              | `4000`                          | Listen port for Express                     |
| `SIFT_LLM_BASE_URL` | _(none; app defaults in DB/UI)_ | Fallback base URL for OpenAI-compatible API |
| `SIFT_LLM_MODEL`    | _(none)_                        | Fallback model id                           |

The server binds to **127.0.0.1** only (localhost).

## Settings stored in SQLite (`settings` table)

These are exposed via `GET/POST /api/settings` and the UI:

| Key            | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `watch_folder` | Directory monitored by the Tauri host (also persisted for UI) |
| `llm_base_url` | Base URL for chat completions (often ends with `/v1`)         |
| `llm_model`    | Model name passed to the LLM API                              |

Defaults if unset (also used by the UI): **`http://127.0.0.1:11434/v1`** and **`llama3.2`** — aligned with **Ollama**’s OpenAI-compatible API on port **11434** (not 8080). See `backend/src/llmDefaults.ts`. Adjust the model to match `ollama list` on your machine (for example `mistral`, `qwen2.5:14b`).

## LLM endpoint shape

The orchestrator calls OpenAI-compatible **chat completions**:

- **URL:** `{llm_base_url}/chat/completions` (if `llm_base_url` already ends with `/v1`, paths are normalized in code).
- **Body:** `model`, `messages`, `temperature`.

If the LLM is unreachable, ingest still completes using a **heuristic** summary and a lower confidence score.

## Frontend

| Variable        | Description                                                                            |
| --------------- | -------------------------------------------------------------------------------------- |
| `VITE_API_BASE` | Optional override for the API base (defaults to `http://127.0.0.1:4000` in the client) |

## Tauri / Rust

Watcher and ingest calls are hardcoded to `http://127.0.0.1:4000` in the host. If you change the backend port, update the Rust client (`post_ingest` in `src-tauri/src/lib.rs`) or add a shared config mechanism.

## Related docs

- [Development](DEVELOPMENT.md)
- [Build and release](BUILD-AND-RELEASE.md)
