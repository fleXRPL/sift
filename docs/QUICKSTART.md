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
2. Optionally set **LLM** URL/model if you run a local OpenAI-compatible server (for example `http://127.0.0.1:8080/v1` and your model id).
3. Drop a small **FHIR JSON** or **`.txt`** HL7 sample into that folder, or use the API later for manual paths.

The **Dashboard** should show the orchestrator as online when `GET /health` succeeds.

## 4. Next steps

- [Development](DEVELOPMENT.md) — scripts, ports, and debugging
- [Configuration](CONFIGURATION.md) — `SIFT_DATA_DIR`, `PORT`, LLM defaults
- [Build and release](BUILD-AND-RELEASE.md) — installers and bundled sidecars
