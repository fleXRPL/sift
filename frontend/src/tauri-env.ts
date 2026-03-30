/** Whether the UI is running inside the Tauri webview (vs a plain browser tab). */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
