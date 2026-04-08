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

- [Rust](https://www.rust-lang.org/tools/install) (latest stable — run `rustup update stable`)
- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.com/) running locally with a compatible model (e.g. `ollama run gemma4:26b`)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on most Windows 10/11 systems)

### Clone, install, run

```bash
git clone https://github.com/fleXRPL/sift.git
cd sift
node sift.mjs deps    # installs all npm dependencies (root + frontend + backend)
node sift.mjs check   # pre-flight: verifies Node, Rust, Ollama, and configured model
node sift.mjs run     # starts Tauri dev shell + Vite + backend in one command
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for the full step-by-step checklist.

### `sift.mjs` CLI reference

| Command | What it does |
| ------- | ------------ |
| `node sift.mjs run` | Start the full dev stack (Tauri + Vite + backend) |
| `node sift.mjs check` | Pre-flight check: Node, Rust, deps, Ollama, model |
| `node sift.mjs deps` | Install all npm dependencies |
| `node sift.mjs debug` | Start with verbose logging |
| `node sift.mjs stop` | Kill all running dev processes |
| `node sift.mjs package` | Bundle the backend into a Windows sidecar `.exe` |

### Tests and CI

```bash
npm test                        # run all backend + frontend tests
npm test --prefix backend       # backend only (Jest)
npm test --prefix frontend      # frontend only (Vitest)
```

Continuous integration runs on every push and PR via [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — covers backend (Jest), frontend (Vitest + build), and Rust (`cargo check`). Details: [docs/TESTING.md](docs/TESTING.md).

### Creating a release

Push a version tag to trigger the automated Windows installer build:

```bash
# 1. Bump version in tauri.conf.json, Cargo.toml, and package.json (keep in sync)
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions builds a signed NSIS `.exe` installer on `windows-latest` and attaches it to a GitHub Release automatically. See [docs/BUILD-AND-RELEASE.md](docs/BUILD-AND-RELEASE.md) for full details, manual build steps, and code-signing setup.

---

## Project structure

```text
sift/
├── .cursor/
│   ├── rules/      # Cursor coding rules (TypeScript, Rust, security, testing)
│   └── skills/     # On-demand healthcare skills (PHI, HIPAA, EMR, CDSS)
├── .github/
│   ├── workflows/ci.yml       # CI: backend, frontend, cargo check
│   └── workflows/release.yml  # Release: Windows NSIS installer on version tag
├── docs/           # Documentation (start at docs/README.md)
├── frontend/       # Vite + React + Tailwind UI
├── backend/        # Node orchestrator (Express, SQLite, ingest, LLM client)
├── src-tauri/      # Tauri host: tray, folder watch, sidecar lifecycle
├── samples/        # Sample FHIR, HL7, and PDF files for manual testing
├── img/            # Brand assets (icon source for Tauri)
├── sift.mjs        # Developer CLI (run / check / deps / debug / stop / package)
└── data/           # Local SQLite (sift.db), created at runtime
```

---

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Testing strategy and CI expectations are outlined in [docs/TESTING.md](docs/TESTING.md).

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
