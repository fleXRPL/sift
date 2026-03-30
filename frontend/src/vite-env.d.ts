/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  /** Present when running inside the Tauri shell */
  readonly TAURI_PLATFORM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
