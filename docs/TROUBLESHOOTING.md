# Troubleshooting

## Orchestrator offline / Dashboard shows error

**Symptoms:** UI says the backend is offline; `GET /health` fails.

**Checks:**

1. Confirm something listens on **`127.0.0.1:4000`** (Task Manager / `lsof` / `netstat`).
2. Start backend alone: `cd backend && npm run dev`.
3. If you changed **`PORT`**, update the frontend `VITE_API_BASE` and any hardcoded Rust URLs (see [Configuration](CONFIGURATION.md)).

## `npm run dev` fails or Tauri exits with `--ci` error

**Symptoms:** `error: invalid value '1' for '--ci'`.

**Cause:** Some CI environments set **`CI=1`**, which confuses the Tauri CLI flag parser.

**Fix:** The repo uses **`cross-env CI=false`** on production builds. For ad hoc runs:

```bash
cross-env CI=false npx tauri build
# or
env -u CI npx tauri dev
```

## Vite “port already in use” (1420)

**Symptoms:** Vite cannot bind to 1420.

**Fix:** Stop other Vite processes or change `frontend/vite.config.ts` **and** `src-tauri/tauri.conf.json` `devUrl` together.

## Folder watch does nothing

**Checks:**

1. **Tauri runtime:** Watching requires the **desktop app**, not the UI opened in a normal browser alone.
2. **Path:** Pick a folder that exists and is readable; subfolders are watched recursively.
3. **Events:** Some editors save via **rename**; the watcher treats create/modify. Try copying a new file into the folder.
4. **Backend:** Ingest fails if `POST /api/ingest` cannot read the file path (permissions, AV locking).

## LLM errors in document rows

**Symptoms:** Summary falls back to “Local synthesis (LLM unavailable…)”; `error_message` populated.

**Checks:**

1. LLM server is up and serves **`POST .../v1/chat/completions`** (or normalized base URL in settings).
2. **Model id** matches what the server expects.
3. Firewall rules allow **loopback** traffic.

## SQLite / database locked

**Symptoms:** Rare `SQLITE_BUSY` under heavy concurrent access.

**Fix:** Single writer design; avoid opening `sift.db` with external tools while the app runs. Backend uses WAL mode to reduce contention.

## Rust toolchain errors

**Symptoms:** `edition2024` or very new crate errors.

**Fix:** `rustup update stable` and align with `rust-toolchain.toml`. See [Installation](INSTALLATION.md).

## WebView blank (Windows)

**Fix:** Install or repair **WebView2 Evergreen Runtime** ([Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)).

## Still stuck

Open an issue with **OS version**, **Rust (`rustc --version`)**, **Node (`node --version`)**, and the **first error line** from the terminal.
