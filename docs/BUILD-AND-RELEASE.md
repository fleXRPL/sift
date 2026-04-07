# Build and release

This document covers **production builds**, **Windows installers**, the **Node.js
backend sidecar**, and the **GitHub Actions release workflow**.

## Development vs production

| Mode | UI | Backend | Tauri |
| ---- | -- | ------- | ----- |
| `node sift.mjs run` | Vite on :1420 | `ts-node` (runs separately) | `tauri dev` — connects to Vite |
| `tauri build` (release) | `frontend/dist` embedded | `sift-backend-*.exe` sidecar | Full native bundle + NSIS installer |

In **development** the backend is a separate process you manage via `npm start`.
In **production** Tauri spawns the pre-bundled backend sidecar automatically on
startup and kills it when the app exits.

---

## Step-by-step: build a Windows installer locally

> You need a **Windows machine** (or `windows-latest` CI runner) for the final
> `tauri build` step. The backend sidecar must be compiled targeting Windows.

### 1. Install all dependencies

```bash
node sift.mjs deps
```

### 2. Bundle the backend sidecar

```bash
node sift.mjs package
# or: cd backend && npm run package
```

This runs `tsc` then `pkg` and writes:

```powershell
src-tauri/binaries/sift-backend-x86_64-pc-windows-msvc.exe
```

Tauri requires the binary to end with the Rust target triple. `pkg` bundles
Node.js 18 + all JS/TS dependencies into a single `.exe`.

> **`better-sqlite3` note:** `pkg` bundles the prebuilt `.node` native addon as
> an asset (configured in `backend/package.json` under `pkg.assets`). If the
> build fails on a native module, make sure `npm ci` ran in `backend/` first so
> the correct Windows prebuilt is present in `node_modules`.

### 3. Build the frontend

```bash
npm run build --prefix frontend
```

### 4. Run `tauri build`

```bash
cross-env CI=false npx tauri build
```

Or from the root:

```bash
npm run build
```

The NSIS installer is written to:

```powershell
src-tauri/target/release/bundle/nsis/Sift_<version>_x64-setup.exe
```

---

## GitHub Actions — automated Windows release

Workflow: [`.github/workflows/release.yml`](../.github/workflows/release.yml)

### Triggering a release

Push a version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The `release.yml` workflow runs on `windows-latest` and:

1. Installs Node 18 + all npm deps
2. Builds frontend (`vite build`)
3. Bundles backend sidecar with `pkg` → `src-tauri/binaries/`
4. Verifies the `.exe` exists and prints its size
5. Runs `npx tauri build` (with `CI=false`)
6. Uploads the NSIS `.exe` as a **GitHub Release asset** (auto-generated release notes)
7. Also saves the installer as a workflow **artifact** (30-day retention) for non-tag builds

### Manual test build (no tag needed)

Go to **Actions → Release — Windows installer → Run workflow** on GitHub and trigger
it manually. The installer will be available as a downloadable artifact.

### Optional: code-signing

Set these repository secrets to sign the installer:

| Secret | Value |
| ------ | ----- |
| `TAURI_SIGNING_PRIVATE_KEY` | PEM-encoded private key from `tauri signer generate` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password (can be empty) |

Unsigned builds work fine for internal distribution but Windows Defender SmartScreen
will warn users on first run.

---

## Sidecar lifecycle (production)

The Rust code in `src-tauri/src/lib.rs` handles the backend sidecar automatically:

- **Startup** (`setup()`): spawns `sift-backend` and polls `GET /health` for up to
  15 seconds before the UI loads.
- **Tray → Quit**: kills the child process before calling `app.exit(0)`.
- **Dev builds** (`cargo build` / `tauri dev`): sidecar code is compiled out via
  `#[cfg(not(debug_assertions))]` — the backend runs separately as usual.

---

## Icons

Regenerate all icon sizes from the master SVG:

```bash
cd src-tauri
npx @tauri-apps/cli icon ../img/sift-icon.svg
```

---

## Version bumps

Update all three in sync before tagging:

| File | Field |
| ---- | ----- |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` |
| Root `package.json` | `"version"` |

---

## Related docs

- [Installation](INSTALLATION.md)
- [Development](DEVELOPMENT.md)
- [Configuration](CONFIGURATION.md)
