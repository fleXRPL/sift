# Quick start

This is the shortest path to a running Sift development environment. For prerequisites and platform notes, see [Installation](INSTALLATION.md).

## 1. Clone and install

```bash
git clone https://github.com/fleXRPL/sift.git
cd sift
node sift.mjs deps
```

`deps` installs npm packages for root, frontend, and backend in one step.

## 2. Check everything is ready

```bash
node sift.mjs check
```

This verifies Node.js, Rust, npm dependencies, Ollama availability, and your configured model **before** anything starts. Example output:

```
Pre-flight checks
  ✓ Node.js v23.5.0
  ✓ Rust: rustc 1.94.1
  ✓ npm dependencies installed (root, frontend, backend)
  ✓ Ollama reachable at http://127.0.0.1:11434 — 10 model(s) available
  ✓ Model available: llama3.2:latest

  All checks passed. Ready to start.
```

> **Ollama:** Sift defaults to Ollama Desktop's OpenAI-compatible API at
> `http://127.0.0.1:11434/v1` and model `llama3.2`. Start Ollama Desktop or
> run `ollama serve`, then `ollama pull llama3.2` if the model is missing.
> Any OpenAI-compatible server (LM Studio, `llama-server`, etc.) works —
> set **Base URL** and **Model id** in Settings to match.

## 3. Start everything

```bash
node sift.mjs run
# or
npm start
```

`run` repeats the pre-flight check, warns if Ollama is not available (but still starts), then launches:

- **Backend** (Node) — `http://127.0.0.1:4000`
- **Frontend** (Vite) — `http://localhost:1420`
- **Tauri** — native window, system tray, and folder watching

Press `Ctrl+C` to stop all three processes at once.

## 4. Confirm it works

1. Open **Settings**, pick a **records folder** (any empty directory is fine).
2. If `check` reported a missing model, click **Use Ollama defaults** or update **Base URL** / **Model id** to match your LLM server.
3. Drop a **FHIR JSON** or **HL7 v2 `.hl7`** file into the watched folder. The **Documents** tab should populate within a few seconds.

## 5. Other commands

| Command                                     | Purpose                                                 |
| ------------------------------------------- | ------------------------------------------------------- |
| `node sift.mjs debug`                       | Same as `run` with `DEBUG=sift:*` and `RUST_LOG=debug`  |
| `node sift.mjs stop`                        | Kill processes on ports 4000 and 1420                   |
| `node sift.mjs help`                        | Full usage reference                                    |
| `SIFT_LLM_MODEL=mistral node sift.mjs run`  | Override the model for this session                     |

## 6. Next steps

- [Development](DEVELOPMENT.md) — scripts, ports, and debugging
- [Configuration](CONFIGURATION.md) — `SIFT_DATA_DIR`, `PORT`, LLM defaults
- [Build and release](BUILD-AND-RELEASE.md) — installers and bundled sidecars
