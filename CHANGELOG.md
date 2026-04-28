# Changelog

All notable changes to Sift are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_Changes staged for the next release go here during development._

---

## [0.1.1] — 2026-04-28

### Security

- **vite** upgraded `6.4.1` → `6.4.2`, resolving two CVEs in the Vite dev server (arbitrary file read via WebSocket — GHSA-p9ff-h696-f583, High; path traversal in optimised deps `.map` handling — GHSA-4w7w-66w2-5vf9, Moderate)
- **postcss** minimum bumped to `^8.5.10`, resolving a moderate XSS via unescaped `</style>` in CSS stringify output (GHSA-qx2v-qp2m-jg93)
- **rustls-webpki** `0.103.10` → `0.103.13`, resolving three CVEs: DoS via panic on malformed CRL BIT STRING (High); name constraints accepted for wildcard certificates (Low); name constraints for URI names incorrectly accepted (Low)
- **rand** `0.8.5` → `0.8.6` (transitive Tauri dependency; latest compatible patch)
- Replaced abandoned `pkg` (`vercel/pkg`, GHSA-22r3-9w55-cj54 — Local Privilege Escalation) with `@yao-pkg/pkg`, the actively maintained community fork; no API changes required

### Added

- `deny.toml` — cargo-deny configuration documenting two advisories that cannot be resolved at the project level due to upstream tauri ecosystem constraints (glib `RUSTSEC-2024-0403`, rand 0.7.x `RUSTSEC-2025-0009`); suppressed with full justification
- `backend/package.json` — `package:mac-arm` and `package:mac-x64` scripts for building the backend sidecar on macOS (Apple Silicon and Intel)
- `sift.mjs package` — now auto-detects host platform and selects the correct packaging target (Windows, macOS ARM, macOS Intel)

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

[Unreleased]: https://github.com/fleXRPL/sift/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/fleXRPL/sift/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/fleXRPL/sift/releases/tag/v0.1.0
