# Quick start

This is the shortest path to a running Sift development environment. For prerequisites and platform notes, see [Installation](INSTALLATION.md).

## 1. Clone and install

```bash
git clone https://github.com/fleXRPL/sift.git
cd sift

npm install
npm install --prefix frontend
npm install --prefix backend
```

## 2. Start everything

```bash
npm run dev
```

This starts, in parallel:

- **Backend** (Node) — `http://127.0.0.1:4000`
- **Frontend** (Vite) — `http://localhost:1420`
- **Tauri** — loads the UI in a native window and enables tray + folder watching

## 3. Confirm it works

1. In the app, open **Settings** and pick a **records folder** (any empty test directory is fine).
2. **Local LLM (Ollama):** Sift defaults to **Ollama’s** OpenAI-compatible API at **`http://127.0.0.1:11434/v1`** and model **`llama3.2`**. If you use Ollama Desktop, leave that (or click **Use Ollama defaults**) and set **Model id** to a tag from `ollama list` (for example `llama3.2:latest`). Other servers (LM Studio, `llama-server`, etc.) often use a different host/port—set **Base URL** and **Model id** to match.
3. Drop a small **FHIR JSON** or **`.txt`** HL7 sample into that folder, or use the API later for manual paths.

The **Dashboard** should show the orchestrator as online when `GET /health` succeeds.

## 4. Next steps

- [Development](DEVELOPMENT.md) — scripts, ports, and debugging
- [Configuration](CONFIGURATION.md) — `SIFT_DATA_DIR`, `PORT`, LLM defaults
- [Build and release](BUILD-AND-RELEASE.md) — installers and bundled sidecars
