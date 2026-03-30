# Sift 🩺

![Sift](img/sift-icon.svg)

> **Stop searching. Start sifting.**

**Sift** is a privacy-first, local-only clinical intelligence engine designed for modern medical offices. It acts as an automated "watchdog," monitoring local folders for incoming clinical data—EPIC exports, FHIR JSONs, and scanned PDFs—and synthesizing them into actionable clinical summaries using local LLM inference.

## 🌟 Key Features

- **Zero-Cloud Architecture:** All processing happens on the local machine. No data ever leaves the office network, ensuring native HIPAA compliance by design.
- **Automated Ingestion:** Monitors designated Windows directories for new files. Drop a PDF or FHIR export in, and Sift begins processing immediately.
- **Multi-Source Synthesis:** Intelligently maps data from structured (FHIR, HL7) and unstructured (Clinical PDFs) sources into a unified patient timeline.
- **Single-Binary Distribution:** Orchestrates a Rust core, a Node.js orchestrator, and a local inference engine (`llama-server`) in a single, lightweight Windows application.
- **Clinical Guardrails:** Provides evidence-backed summaries with confidence scores and direct links to source documentation.

---

## 🏗 Architecture

Sift is built on a **Polyglot Sidecar Architecture** to leverage the best of native performance and high-level data processing:

- **Host (Rust/Tauri):** Manages the Windows lifecycle, system tray, and high-performance file system watching.
- **Orchestrator (Node.js Sidecar):** Handles complex business logic, PDF parsing, and SQLite data management.
- **Inference (llama-server):** Provides an OpenAI-compatible API for local LLMs (Llama 3, Mistral) running on the local CPU/GPU.
- **Storage (SQLite):** An embedded, relational database for persistent patient history and audit logs.

---

## Documentation

Full guides live in **[docs/](docs/README.md)**:

- [Quick start](docs/QUICKSTART.md) · [Installation](docs/INSTALLATION.md) · [Development](docs/DEVELOPMENT.md)
- [Configuration](docs/CONFIGURATION.md) · [Architecture](docs/ARCHITECTURE.md) · [Build and release](docs/BUILD-AND-RELEASE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md) · [Security and compliance](docs/SECURITY-AND-COMPLIANCE.md) · [Testing](docs/TESTING.md)

## Getting started (developers)

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (included on most Windows 10/11 systems)

### Clone, install, run

```bash
git clone https://github.com/fleXRPL/sift.git
cd sift
npm install && npm install --prefix frontend && npm install --prefix backend
npm run dev
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for a step-by-step checklist.

### Tests and CI

```bash
npm test
```

Continuous integration is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (backend, frontend, Rust `cargo check`). Details: [docs/TESTING.md](docs/TESTING.md).

---

## Project structure

```text
sift/
├── .github/        # GitHub Actions workflows
├── docs/           # Documentation (start at docs/README.md)
├── frontend/       # Vite + React + Tailwind UI
├── backend/        # Node orchestrator (Express, SQLite, ingest, LLM client)
├── src-tauri/      # Tauri host: tray, folder watch → POST /api/ingest
├── img/            # Brand assets (e.g. icon source for Tauri)
└── data/           # Local SQLite (sift.db), created at runtime
```

---

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Testing strategy and CI expectations are outlined in [docs/TESTING.md](docs/TESTING.md).

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

**Windows release:** build the Node sidecar with `npm run package --prefix backend` (requires `pkg`), place `llama-server` next to the app per `docs/Transform-Summary.md`, then add `externalBin` entries in `src-tauri/tauri.conf.json` before bundling.
