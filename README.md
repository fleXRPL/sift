# Sift 🩺

> **Stop searching. Start sifting.**

**Sift** is a privacy-first, local-only clinical intelligence engine designed for modern medical offices. It acts as an automated "watchdog," monitoring local folders for incoming clinical data—EPIC exports, FHIR JSONs, and scanned PDFs—and synthesizing them into actionable clinical summaries using local LLM inference.

[](https://opensource.org/licenses/MIT)
[](https://www.google.com/search?q=https://microsoft.com/windows)
[](https://v2.tauri.app/)

-----

## 🌟 Key Features

  * **Zero-Cloud Architecture:** All processing happens on the local machine. No data ever leaves the office network, ensuring native HIPAA compliance by design.
  * **Automated Ingestion:** Monitors designated Windows directories for new files. Drop a PDF or FHIR export in, and Sift begins processing immediately.
  * **Multi-Source Synthesis:** Intelligently maps data from structured (FHIR, HL7) and unstructured (Clinical PDFs) sources into a unified patient timeline.
  * **Single-Binary Distribution:** Orchestrates a Rust core, a Node.js orchestrator, and a local inference engine (`llama-server`) in a single, lightweight Windows application.
  * **Clinical Guardrails:** Provides evidence-backed summaries with confidence scores and direct links to source documentation.

-----

## 🏗 Architecture

Sift is built on a **Polyglot Sidecar Architecture** to leverage the best of native performance and high-level data processing:

  * **Host (Rust/Tauri):** Manages the Windows lifecycle, system tray, and high-performance file system watching.
  * **Orchestrator (Node.js Sidecar):** Handles complex business logic, PDF parsing, and SQLite data management.
  * **Inference (llama-server):** Provides an OpenAI-compatible API for local LLMs (Llama 3, Mistral) running on the local CPU/GPU.
  * **Storage (SQLite):** An embedded, relational database for persistent patient history and audit logs.

-----

## 🚀 Getting Started (Devs)

### Prerequisites

  * [Rust](https://www.rust-lang.org/tools/install) (latest stable)
  * [Node.js](https://nodejs.org/) (v18+)
  * [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Included in Win 10/11)

### Installation

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/your-username/sift.git
    cd sift
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Run in Development Mode:**

    ```bash
    npm run tauri dev
    ```

-----

## 📂 Project Structure

```text
sift/
├── src-tauri/      # Rust Host: System integration & File Watcher
├── backend/        # Node.js Sidecar: Data Orchestration & AI Logic
├── frontend/       # Next.js: Clinical Dashboard (Static Export)
├── binaries/       # Sidecar executables (llama-server, etc.)
└── data/           # Local storage (sift.db)
```

-----

## 🤝 Contributing

We welcome contributions\! As a DevOps-driven project, we maintain high standards for automation and code quality. Please see `CONTRIBUTING.md` (coming soon) for details on our workflow and PR process.

-----

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

-----

**Would you like me to help you draft the `src-tauri/tauri.conf.json` file now so you can define the sidecars and get the project structure synced up?**
