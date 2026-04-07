import { useCallback, useEffect, useState } from "react";
import { MarkdownText } from "./MarkdownText";

const OLLAMA_DEFAULT_BASE = "http://127.0.0.1:11434/v1";
const OLLAMA_DEFAULT_MODEL = "llama3.2";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { api, type DocumentDetail, type DocumentRow, type Health, type Settings } from "./api";
import { printClinicalReport } from "./printReport";
import { isTauriRuntime } from "./tauri-env";

type Tab = "dashboard" | "documents" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [watchHint, setWatchHint] = useState<string | null>(null);
  const [ingestPath, setIngestPath] = useState("");
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestHint, setIngestHint] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      setErr(null);
      const h = await api.health();
      setHealth(h);
    } catch (e) {
      setHealth(null);
      setErr(e instanceof Error ? e.message : "Backend unreachable");
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch {
      setSettings(null);
    }
  }, []);

  const refreshDocs = useCallback(async () => {
    try {
      const { items } = await api.listDocuments();
      setDocs(items);
    } catch {
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void refreshSettings();
    void refreshDocs();
    const id = globalThis.setInterval(() => void refreshHealth(), 8000);
    return () => globalThis.clearInterval(id);
  }, [refreshHealth, refreshSettings, refreshDocs]);

  useEffect(() => {
    if (!health || !settings?.watch_folder) return;
    if (!isTauriRuntime()) return;
    void invoke("set_watch_folder", { path: settings.watch_folder }).catch((e) =>
      setWatchHint(e instanceof Error ? e.message : String(e)),
    );
  }, [health, settings?.watch_folder]);

  // Auto-poll every 3 s while any document is still processing.
  useEffect(() => {
    const anyProcessing = docs.some((d) => d.status === "processing");
    if (!anyProcessing) return;
    const id = globalThis.setInterval(() => void refreshDocs(), 3000);
    return () => globalThis.clearInterval(id);
  }, [docs, refreshDocs]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const d = await api.getDocument(selectedId);
        if (!cancelled) setDetail(d);
      } catch {
        if (!cancelled) setDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function pickWatchFolder() {
    const dir = await open({ directory: true, multiple: false });
    if (dir === null || Array.isArray(dir)) return;
    await api.saveSettings({ watch_folder: dir });
    const updated = await api.getSettings();
    setSettings(updated);
    try {
      await invoke("set_watch_folder", { path: dir });
    } catch {
      // non-Tauri env — watcher not available, scan still works via API
    }
    // Auto-ingest everything already in the new folder.
    setIngestBusy(true);
    setIngestHint("Scanning new folder…");
    try {
      const res = await fetch("http://127.0.0.1:4000/api/scan", { method: "POST" });
      const json = (await res.json()) as { queued: number };
      setIngestHint(`Found ${json.queued} file(s) in folder — synthesising…`);
      setTab("documents");
    } catch {
      setIngestHint("Folder set. Drop files in to start ingesting.");
    } finally {
      setIngestBusy(false);
      setTimeout(() => void refreshDocs(), 1000);
    }
  }

  async function saveLlm(url: string, model: string) {
    await api.saveSettings({ llm_base_url: url, llm_model: model });
    setSettings(await api.getSettings());
  }

  async function deleteDoc(id: string) {
    await api.deleteDocument(id);
    if (selectedId === id) setSelectedId(null);
    void refreshDocs();
  }

  async function manualIngest(path: string) {
    if (!path.trim()) return;
    setIngestBusy(true);
    setIngestHint(null);
    try {
      await api.ingestPath(path.trim());
      setIngestHint(`Queued: ${path.trim().split(/[\\/]/).at(-1)}`);
      setIngestPath("");
      setTimeout(() => void refreshDocs(), 1500);
    } catch (e) {
      setIngestHint(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIngestBusy(false);
    }
  }

  async function scanWatchFolder() {
    if (!settings?.watch_folder) return;
    setIngestBusy(true);
    setIngestHint("Scanning folder…");
    try {
      const result = await invoke<{ queued: number; skipped: number }>("scan_watch_folder", {
        path: settings.watch_folder,
      });
      setIngestHint(`Queued ${result.queued} file(s), skipped ${result.skipped}.`);
    } catch {
      // Tauri command not available (browser dev mode) — fall back to REST
      const res = await fetch(`http://127.0.0.1:4000/api/scan`, { method: "POST" });
      const json = (await res.json()) as { queued: number };
      setIngestHint(`Queued ${json.queued} file(s) via API.`);
    }
    setTimeout(() => void refreshDocs(), 2000);
    setIngestBusy(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-white to-teal-50/40">
      <header className="border-b border-clinical-border bg-white/90 backdrop-blur sticky top-0 z-10 print:hidden shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/sift-icon.svg" alt="" className="h-9 w-9 rounded-full" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-800">Sift</h1>
              <p className="text-xs text-slate-400">Local clinical intelligence</p>
            </div>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 border border-clinical-border">
            {(
              [
                ["dashboard", "Dashboard"],
                ["documents", "Documents"],
                ["settings", "Settings"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  tab === id
                    ? "bg-clinical-teal text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 print:max-w-none print:px-0 print:py-0">
        {err && (
          <output className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 text-sm print:hidden block">
            <strong className="font-semibold">Orchestrator:</strong> {err}. Start the backend or wait for
            it to finish starting.
          </output>
        )}

        {tab === "dashboard" && (
          <section className="space-y-6 print:hidden">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                title="Orchestrator"
                value={health ? "Online" : "Offline"}
                hint={health?.timestamp ? new Date(health.timestamp).toLocaleString() : undefined}
                good={!!health}
              />
              <Stat
                title="Watch folder"
                value={settings?.watch_folder ? "Configured" : "Not set"}
                hint={settings?.watch_folder ?? "Choose a folder in Settings"}
                good={!!settings?.watch_folder}
              />
              <Stat
                title="LLM endpoint"
                value={settings?.llm_base_url ? "Set" : "Default"}
                hint={settings?.llm_base_url ?? "http://127.0.0.1:11434/v1"}
                good
              />
            </div>
            {watchHint && (
              <p className="text-sm text-slate-500 border border-clinical-border rounded-lg px-4 py-3 bg-white">
                {watchHint}
              </p>
            )}
            <div className="rounded-xl border border-clinical-border bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-clinical-sage uppercase tracking-wide mb-2">
                Zero-click workflow
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
                Drop FHIR JSON, HL7 text exports, or clinical PDFs into your watch folder. Sift detects
                the format, extracts structured facts where possible, and asks your local model for a
                concise narrative with confidence scoring. Nothing leaves this machine.
              </p>
            </div>
          </section>
        )}

        {tab === "documents" && (
          <section className="grid gap-6 lg:grid-cols-5 print:block">
            <div className="lg:col-span-2 space-y-3 print:hidden">
              {/* Manual ingest panel */}
              <div className="rounded-xl border border-clinical-border bg-white p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">Add a file</p>
                  {settings?.watch_folder && (
                    <button
                      type="button"
                      disabled={ingestBusy}
                      onClick={() => void scanWatchFolder()}
                      className="text-xs text-clinical-teal hover:underline disabled:opacity-50"
                    >
                      Scan watch folder
                    </button>
                  )}
                </div>

                {/* Browse button — native file picker */}
                <button
                  type="button"
                  disabled={ingestBusy}
                  onClick={() => void (async () => {
                    const picked = await open({
                      multiple: false,
                      directory: false,
                      filters: [
                        { name: "Clinical records", extensions: ["json", "hl7", "pdf", "txt"] },
                        { name: "All files", extensions: ["*"] },
                      ],
                      defaultPath: settings?.watch_folder ?? undefined,
                    });
                    if (picked && !Array.isArray(picked)) {
                      setIngestPath(picked);
                      void manualIngest(picked);
                    }
                  })()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-clinical-border bg-clinical-warm hover:bg-clinical-mint hover:border-clinical-teal transition px-3 py-3 text-sm text-slate-500 hover:text-clinical-teal disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v6m-3-3h6" />
                  </svg>
                  Browse for file…
                </button>

                {/* Manual path fallback */}
                <details className="group">
                  <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600 list-none flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Type a path manually
                  </summary>
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 rounded-lg bg-clinical-warm border border-clinical-border px-2 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-clinical-teal/30"
                      placeholder="/full/path/to/file.json"
                      value={ingestPath}
                      onChange={(e) => setIngestPath(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void manualIngest(ingestPath); }}
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      disabled={ingestBusy || !ingestPath.trim()}
                      onClick={() => void manualIngest(ingestPath)}
                      className="rounded-lg bg-clinical-teal text-white px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-40 transition"
                    >
                      {ingestBusy ? "…" : "Go"}
                    </button>
                  </div>
                </details>

                {ingestHint && (
                  <p className={`text-xs ${ingestHint.startsWith("Error") ? "text-rose-500" : "text-slate-400"}`}>
                    {ingestHint}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-600">Ingested files</h2>
                <button
                  type="button"
                  onClick={() => void refreshDocs()}
                  className="text-xs text-clinical-teal hover:underline"
                >
                  Refresh
                </button>
              </div>
              <ul className="rounded-xl border border-clinical-border divide-y divide-clinical-border max-h-[60vh] overflow-auto bg-white shadow-sm">
                {docs.length === 0 && (
                  <li className="px-4 py-8 text-sm text-slate-400 text-center">No documents yet.</li>
                )}
                {docs.map((d) => (
                  <li key={d.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={`w-full text-left px-4 py-3 pr-8 text-sm transition hover:bg-clinical-mint ${
                        selectedId === d.id ? "bg-clinical-teal2 border-l-2 border-clinical-teal" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {d.status === "processing" && (
                          <svg className="h-3 w-3 animate-spin text-clinical-teal shrink-0" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        )}
                        <span className="font-medium text-slate-700 truncate">{d.file_name}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {d.source_type} · {d.status === "processing" ? "Synthesising…" : d.status}
                        {d.confidence != null && ` · ${Math.round(d.confidence * 100)}% conf.`}
                      </div>
                    </button>
                    {/* Delete button — appears on hover */}
                    <button
                      type="button"
                      aria-label={`Remove ${d.file_name}`}
                      onClick={(e) => { e.stopPropagation(); void deleteDoc(d.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition rounded p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-3 print:col-span-full">
              {!detail && (
                <div className="rounded-xl border border-dashed border-clinical-border px-6 py-16 text-center text-slate-400 text-sm print:hidden bg-white/60">
                  Select a document to view synthesis and sources.
                </div>
              )}
              {detail && <ReportCard detail={detail} onClose={() => setSelectedId(null)} />}
            </div>
          </section>
        )}

        {tab === "settings" && settings && (
          <SettingsForm
            settings={settings}
            onPickFolder={() => void pickWatchFolder()}
            onSaveLlm={(url, model) => void saveLlm(url, model)}
          />
        )}
      </main>

      <footer className="border-t border-clinical-border py-4 text-center text-xs text-slate-400 print:hidden bg-white/60">
        Local-only processing · No cloud · HIPAA-aligned deployment on your network
      </footer>
    </div>
  );
}

function Stat(props: Readonly<{ title: string; value: string; hint?: string; good: boolean }>) {
  return (
    <div className="rounded-xl border border-clinical-border bg-white px-4 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400 font-medium">{props.title}</div>
      <div className={`text-lg font-semibold mt-1 ${props.good ? "text-clinical-teal" : "text-rose-400"}`}>
        {props.value}
      </div>
      {props.hint && <div className="text-xs text-slate-400 mt-1 truncate" title={props.hint}>{props.hint}</div>}
    </div>
  );
}

function SettingsForm(props: Readonly<{
  settings: Settings;
  onPickFolder: () => void;
  onSaveLlm: (url: string, model: string) => void;
}>) {
  const [url, setUrl] = useState(props.settings.llm_base_url);
  const [model, setModel] = useState(props.settings.llm_model);

  useEffect(() => {
    setUrl(props.settings.llm_base_url);
    setModel(props.settings.llm_model);
  }, [props.settings.llm_base_url, props.settings.llm_model]);

  return (
    <section className="max-w-xl space-y-6 print:hidden">
      <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
      <div className="rounded-xl border border-clinical-border bg-white p-5 space-y-3 shadow-sm">
        <p className="block text-sm font-medium text-slate-700">Records folder</p>
        <p className="text-xs text-slate-400">
          Monitored by the desktop host. New files trigger ingestion automatically.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            aria-label="Choose records folder"
            onClick={props.onPickFolder}
            className="rounded-lg bg-clinical-teal2 text-clinical-teal border border-clinical-border px-4 py-2 text-sm font-medium hover:bg-clinical-mint transition"
          >
            Choose folder…
          </button>
          <span className="text-xs text-slate-400 truncate max-w-full" title={props.settings.watch_folder ?? ""}>
            {props.settings.watch_folder ?? "None selected"}
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-clinical-border bg-white p-5 space-y-3 shadow-sm">
        <p className="block text-sm font-medium text-slate-700">Local LLM (OpenAI-compatible API)</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          The app does not bundle model weights. It calls your local server using the same shape as OpenAI chat
          completions (<code className="text-clinical-teal">/v1/chat/completions</code>).{" "}
          <strong className="text-slate-600">Ollama</strong> listens on{" "}
          <code className="text-clinical-teal">127.0.0.1:11434</code> by default (not 8080). Use the base URL
          below and a model name from <code className="text-clinical-teal">ollama list</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-clinical-border bg-clinical-warm px-3 py-1.5 text-xs text-slate-600 hover:bg-clinical-mint transition"
            onClick={() => {
              setUrl(OLLAMA_DEFAULT_BASE);
              setModel(OLLAMA_DEFAULT_MODEL);
            }}
          >
            Use Ollama defaults
          </button>
        </div>
        <div>
          <span className="text-xs text-slate-500 font-medium">Base URL</span>
          <input
            className="mt-1 w-full rounded-lg bg-clinical-warm border border-clinical-border px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-clinical-teal/30"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={OLLAMA_DEFAULT_BASE}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div>
          <span className="text-xs text-slate-500 font-medium">Model id</span>
          <input
            className="mt-1 w-full rounded-lg bg-clinical-warm border border-clinical-border px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-clinical-teal/30"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={OLLAMA_DEFAULT_MODEL}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          type="button"
          onClick={() => props.onSaveLlm(url, model)}
          className="rounded-lg bg-clinical-teal text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
        >
          Save LLM settings
        </button>
        <p className="text-xs text-slate-400">
          After saving, drop a new file or re-copy an existing file into the watch folder to regenerate a summary
          with the LLM. Existing rows keep their stored text until re-ingested.
        </p>
      </div>
    </section>
  );
}

function ReportCard(props: Readonly<{ detail: DocumentDetail; onClose: () => void }>) {
  const d = props.detail;
  return (
    <article className="rounded-xl border border-clinical-border bg-white overflow-hidden shadow-md">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-clinical-border bg-clinical-warm">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{d.file_name}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {d.source_type} · {new Date(d.created_at).toLocaleString()}
            {d.confidence != null && ` · Confidence ${Math.round(d.confidence * 100)}%`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => printClinicalReport(d)}
            className="text-xs rounded-md border border-clinical-border bg-clinical-teal2 px-3 py-1.5 text-clinical-teal hover:bg-clinical-mint transition"
          >
            Print report
          </button>
          <button
            type="button"
            onClick={props.onClose}
            className="text-xs text-slate-400 hover:text-slate-700 px-2 transition"
          >
            Close
          </button>
        </div>
      </div>
      <div className="bg-white text-slate-900 px-5 py-5 space-y-6">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-clinical-sage">Clinical synthesis</h4>
          <p className="mt-1 text-xs text-slate-400 leading-snug">
            Text extracted from your file, then summarized by your local LLM (e.g. Ollama). Verify against the
            original record before clinical use.
          </p>
          <div className="mt-3">
            {d.summary_text
              ? <MarkdownText>{d.summary_text}</MarkdownText>
              : <span className="text-sm text-slate-400">No summary available.</span>}
          </div>
          {d.error_message && (
            <p className="mt-3 text-sm text-rose-700 font-medium bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {d.error_message}
            </p>
          )}
        </section>
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-clinical-sage">Extracted context (preview)</h4>
          <p className="mt-1 text-xs text-slate-400">Raw text or structured fields passed to the model (truncated).</p>
          <pre className="mt-2 text-xs bg-clinical-warm border border-clinical-border rounded-lg p-3 overflow-auto max-h-64 text-slate-600 shadow-inner">
            {(d.raw_preview ?? "").slice(0, 8000)}
          </pre>
        </section>
      </div>
    </article>
  );
}
