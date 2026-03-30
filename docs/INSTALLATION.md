# Installation

Sift targets **Windows** for production bundles; developers may also build on **macOS** or **Linux** for the same codebase.

## Prerequisites

### Required for development

| Tool                                                                       | Version               | Notes                                                                                 |
| -------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org/)                                             | 18+ (LTS recommended) | npm comes with Node                                                                   |
| [Rust](https://www.rust-lang.org/tools/install)                            | Latest **stable**     | `rust-toolchain.toml` in the repo pins stable                                         |
| [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) | Runtime               | **Windows:** usually preinstalled on Windows 10/11. Tauri uses the Evergreen runtime. |

### Optional

| Tool                        | Purpose                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Git](https://git-scm.com/) | Clone and version control                                                                                                      |
| Local LLM server            | OpenAI-compatible HTTP API (for example [llama.cpp](https://github.com/ggerganov/llama.cpp) `llama-server`, LM Studio, Ollama) |

## Clone the repository

```bash
git clone https://github.com/fleXRPL/sift.git
cd sift
```

## Install JavaScript dependencies

Install at the **repository root**, **frontend**, and **backend**:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

The root `package.json` provides orchestration scripts (`npm run dev`, `npm run build`) and the Tauri CLI.

## Rust / Cargo

On first `npm run dev` or `cargo build` inside `src-tauri/`, Cargo downloads crates. Ensure you have network access for crates.io.

If your system Rust is very old, update it:

```bash
rustup update stable
```

## Windows-specific notes

- **WebView2:** If the app window fails to render, install the [WebView2 Evergreen Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section).
- **Long paths:** If builds fail with path length errors, enable long paths or clone into a shorter path (for example `C:\dev\sift`).
- **Antivirus:** Corporate AV may slow first runs of `node.exe` or the built `.exe`; allowlisting the dev folder helps.

## macOS / Linux (development only)

- Tauri builds use the platform WebView (Wry). Install Xcode Command Line Tools on macOS if prompted.
- Linux may need additional WebKit/GTK packages per [Tauri prerequisites](https://tauri.app/start/prerequisites/).

## Verify installation

```bash
node --version
rustc --version
npm run dev
```

If the Sift window opens and the dashboard shows the orchestrator online, installation is complete. See [Quick start](QUICKSTART.md) for the shortest happy path.
