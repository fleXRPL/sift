# Build and release

This document covers **production builds**, **Windows installers**, and optional **bundled sidecars** (`sift-backend`, `llama-server`).

## Development vs production

| Mode            | UI              | Backend              | Tauri                                    |
| --------------- | --------------- | -------------------- | ---------------------------------------- |
| `npm run dev`   | Vite on :1420   | `ts-node`            | `tauri dev`                              |
| `npm run build` | `frontend/dist` | `backend/dist` (tsc) | `tauri build` release binary + installer |

## Root production build

```bash
npm run build --prefix frontend
npm run build --prefix backend
cross-env CI=false npx tauri build
```

The root `npm run build` runs the same steps. **`CI=false`** avoids a known issue where `CI=1` in some environments makes the Tauri CLI reject `--ci` parsing.

Artifacts (paths vary by OS):

- **macOS:** `.app`, `.dmg` (if configured)
- **Windows:** `.exe` installer (NSIS per `tauri.conf.json`)

See `src-tauri/tauri.conf.json` → `bundle` for targets (`nsis`, icons, etc.).

## Node sidecar with `pkg`

The backend can be compiled to a standalone executable for bundling next to the Tauri app:

```bash
cd backend
npm run build
npm run package
```

This uses **`pkg`** and writes output under `src-tauri/binaries/` (see `backend/package.json`). Targets are Windows-oriented by default; adjust `pkg` `targets` for other platforms if needed.

## `llama-server` and `externalBin`

For a fully offline setup, bundle **llama.cpp** `llama-server` (or your chosen inference binary) and register it in Tauri:

1. Place binaries under `src-tauri/binaries/` with names expected by Tauri (see [Tauri external binaries](https://v2.tauri.app/develop/sidecar/)).
2. Set `bundle.externalBin` in `src-tauri/tauri.conf.json`.
3. Match **capabilities** for `shell` / sidecar spawn if you launch them from Rust.

The repository ships with **`externalBin`: []** so local development does not require those files. Enable them when you are ready to ship Windows installers.

## Icons

Icons are generated from `img/sift-icon.svg`:

```bash
cd src-tauri
npx @tauri-apps/cli icon ../img/sift-icon.svg
```

## Version bumps

- **`package.json`** (root, frontend, backend) — semantic version for JS packages.
- **`src-tauri/tauri.conf.json`** — `version` for the bundled app.
- **`src-tauri/Cargo.toml`** — `version` for the Rust crate (keep in sync with Tauri config for clarity).

## Related docs

- [Installation](INSTALLATION.md)
- [Transform summary](Transform-Summary.md)
