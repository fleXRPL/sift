# Changelog

All notable changes to Sift are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_Changes staged for the next release go here during development._

---

## [0.1.0] — 2026-04-08

### Added

- Initial MVP release of Sift — a privacy-first, local-only clinical intelligence engine
- Tauri v2 host: Windows system tray, native folder-picker dialog, recursive file system watching via `notify` crate
- Node.js Express backend sidecar with SQLite (`better-sqlite3`) for document storage
- Ingestion pipelines for FHIR JSON, HL7 v2 (pipe-delimited), and PDF (text extraction via `pdf-parse`)
- OpenAI-compatible LLM client targeting local Ollama (`http://127.0.0.1:11434/v1`); heuristic fallback when LLM is unavailable
- React + Vite + Tailwind CSS frontend with pastel colour scheme
- Document list with real-time processing status, auto-polling, and trash-icon deletion
- Manual ingest: browse-button (native dialog) or typed path; "Scan watch folder" button
- Auto-ingest when a new watch folder is selected
- Custom `MarkdownText` component for rendering LLM-generated markdown summaries
- Print-to-PDF via hidden iframe (`printReport.ts`)
- Settings UI: LLM base URL, model name, "Use Ollama defaults" button
- `sift.mjs` developer CLI: `run`, `check`, `deps`, `debug`, `stop`, `package` subcommands
- Backend sidecar bundled as a Windows `.exe` via `pkg`; spawned and lifecycle-managed by Tauri in production builds
- Jest + ts-jest backend test suite (unit + integration with in-memory SQLite)
- Vitest + @testing-library/react frontend test suite (component + API client)
- GitHub Actions CI workflow: backend (Jest), frontend (Vitest + build), Rust (`cargo check`)
- GitHub Actions release workflow: automated Windows NSIS installer on version tag
- Cursor coding rules (TypeScript, Rust, security, testing) in `.cursor/rules/`
- Healthcare compliance skills (PHI, HIPAA, EMR, CDSS) in `.cursor/skills/`
- Sample FHIR, HL7, and PDF test files in `samples/`
- Full documentation suite: QUICKSTART, INSTALLATION, DEVELOPMENT, CONFIGURATION, ARCHITECTURE, BUILD-AND-RELEASE, TESTING, TROUBLESHOOTING, SECURITY-AND-COMPLIANCE, GLOSSARY, CONTRIBUTING

### Security

- All patient data processed locally; no network egress by design (HIPAA-safe by architecture)
- LLM inference via local Ollama — PHI never leaves the machine

---

[Unreleased]: https://github.com/fleXRPL/sift/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fleXRPL/sift/releases/tag/v0.1.0
