import { useCallback, useEffect, useState } from "react";

const OLLAMA_DEFAULT_BASE = "http://127.0.0.1:11434/v1";
const OLLAMA_DEFAULT_MODEL = "llama3.2";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { api, type DocumentDetail, type DocumentRow, type Health, type Settings } from "./api";
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
    const id = window.setInterval(() => void refreshHealth(), 8000);
    return () => window.clearInterval(id);
  }, [refreshHealth, refreshSettings, refreshDocs]);

  useEffect(() => {
    if (!health || !settings?.watch_folder) return;
    if (!isTauriRuntime()) return;
    void invoke("set_watch_folder", { path: settings.watch_folder }).catch((e) =>
      setWatchHint(e instanceof Error ? e.message : String(e)),
    );
  }, [health, settings?.watch_folder]);

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
    setSettings(await api.getSettings());
    try {
      await invoke("set_watch_folder", { path: dir });
      setWatchHint(`Watching: ${dir}`);
    } catch (e) {
      setWatchHint(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveLlm(url: string, model: string) {
    await api.saveSettings({ llm_base_url: url, llm_model: model });
    setSettings(await api.getSettings());
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/sift-icon.svg" alt="" className="h-9 w-9 rounded-full" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">Sift</h1>
              <p className="text-xs text-slate-500">Local clinical intelligence</p>
            </div>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800">
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
                    ? "bg-clinical-navy text-clinical-teal shadow"
                    : "text-slate-400 hover:text-white"
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
          <div
            className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm print:hidden"
            role="status"
          >
            <strong className="font-semibold">Orchestrator:</strong> {err}. Start the backend or wait for
            it to finish starting.
          </div>
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
                hint={settings?.llm_base_url ?? "http://127.0.0.1:8080"}
                good
              />
            </div>
            {watchHint && (
              <p className="text-sm text-slate-400 border border-slate-800 rounded-lg px-4 py-3 bg-slate-900/50">
                {watchHint}
              </p>
            )}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
                Zero-click workflow
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                Drop FHIR JSON, HL7 text exports, or clinical PDFs into your watch folder. Sift detects
                the format, extracts structured facts where possible, and asks your local model for a
                concise narrative with confidence scoring. Nothing leaves this machine.
              </p>
            </div>
          </section>
        )}

        {tab === "documents" && (
          <section className="grid gap-6 lg:grid-cols-5 print:block">
            <div className="lg:col-span-2 space-y-2 print:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-300">Ingested files</h2>
                <button
                  type="button"
                  onClick={() => void refreshDocs()}
                  className="text-xs text-clinical-teal hover:underline"
                >
                  Refresh
                </button>
              </div>
              <ul className="rounded-xl border border-slate-800 divide-y divide-slate-800/80 max-h-[60vh] overflow-auto bg-slate-900/30">
                {docs.length === 0 && (
                  <li className="px-4 py-8 text-sm text-slate-500 text-center">No documents yet.</li>
                )}
                {docs.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={`w-full text-left px-4 py-3 text-sm transition hover:bg-slate-800/50 ${
                        selectedId === d.id ? "bg-slate-800/70 border-l-2 border-clinical-teal" : ""
                      }`}
                    >
                      <div className="font-medium text-slate-100 truncate">{d.file_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {d.source_type} · {d.status}
                        {d.confidence != null && ` · ${Math.round(d.confidence * 100)}% conf.`}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-3 print:col-span-full">
              {!detail && (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-500 text-sm print:hidden">
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

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-600 print:hidden">
        Local-only processing · No cloud · HIPAA-aligned deployment on your network
      </footer>
    </div>
  );
}

function Stat(props: { title: string; value: string; hint?: string; good: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{props.title}</div>
      <div className={`text-lg font-semibold mt-1 ${props.good ? "text-emerald-400" : "text-rose-400"}`}>
        {props.value}
      </div>
      {props.hint && <div className="text-xs text-slate-500 mt-1 truncate" title={props.hint}>{props.hint}</div>}
    </div>
  );
}

function SettingsForm(props: {
  settings: Settings;
  onPickFolder: () => void;
  onSaveLlm: (url: string, model: string) => void;
}) {
  const [url, setUrl] = useState(props.settings.llm_base_url);
  const [model, setModel] = useState(props.settings.llm_model);

  useEffect(() => {
    setUrl(props.settings.llm_base_url);
    setModel(props.settings.llm_model);
  }, [props.settings.llm_base_url, props.settings.llm_model]);

  return (
    <section className="max-w-xl space-y-6 print:hidden">
      <h2 className="text-lg font-semibold text-white">Settings</h2>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <label className="block text-sm font-medium text-slate-300">Records folder</label>
        <p className="text-xs text-slate-500">
          Monitored by the desktop host. New files trigger ingestion automatically.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={props.onPickFolder}
            className="rounded-lg bg-clinical-teal/20 text-clinical-teal border border-clinical-teal/40 px-4 py-2 text-sm font-medium hover:bg-clinical-teal/30"
          >
            Choose folder…
          </button>
          <span className="text-xs text-slate-500 truncate max-w-full" title={props.settings.watch_folder ?? ""}>
            {props.settings.watch_folder ?? "None selected"}
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <label className="block text-sm font-medium text-slate-300">Local LLM (OpenAI-compatible API)</label>
        <p className="text-xs text-slate-500 leading-relaxed">
          The app does not bundle model weights. It calls your local server using the same shape as OpenAI chat
          completions (<code className="text-clinical-teal">/v1/chat/completions</code>).{" "}
          <strong className="text-slate-400">Ollama</strong> listens on{" "}
          <code className="text-clinical-teal">127.0.0.1:11434</code> by default (not 8080). Use the base URL
          below and a model name from <code className="text-clinical-teal">ollama list</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            onClick={() => {
              setUrl(OLLAMA_DEFAULT_BASE);
              setModel(OLLAMA_DEFAULT_MODEL);
            }}
          >
            Use Ollama defaults
          </button>
        </div>
        <div>
          <span className="text-xs text-slate-500">Base URL</span>
          <input
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={OLLAMA_DEFAULT_BASE}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div>
          <span className="text-xs text-slate-500">Model id</span>
          <input
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono"
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
          className="rounded-lg bg-slate-100 text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-white"
        >
          Save LLM settings
        </button>
        <p className="text-xs text-slate-600">
          After saving, drop a new file or re-copy an existing file into the watch folder to regenerate a summary
          with the LLM. Existing rows keep their stored text until re-ingested.
        </p>
      </div>
    </section>
  );
}

function ReportCard(props: { detail: DocumentDetail; onClose: () => void }) {
  const d = props.detail;
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden print:border-slate-300 print:bg-white print:shadow-none">
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800 print:border-slate-200">
        <div>
          <h3 className="text-base font-semibold text-white print:text-slate-900">{d.file_name}</h3>
          <p className="text-xs text-slate-500 mt-1 print:text-slate-600">
            {d.source_type} · {new Date(d.created_at).toLocaleString()}
            {d.confidence != null && ` · Confidence ${Math.round(d.confidence * 100)}%`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-xs rounded-md border border-slate-600 px-3 py-1.5 text-slate-300 hover:bg-slate-800 print:hidden"
        >
          Print report
        </button>
        <button
          type="button"
          onClick={props.onClose}
          className="text-xs text-slate-500 hover:text-white print:hidden"
        >
          Close
        </button>
      </div>
      <div className="px-6 py-6 space-y-6 print-sheet print:block">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-600">
            Clinical synthesis
          </h4>
          <div className="mt-2 prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 print:prose-slate print:text-slate-800 whitespace-pre-wrap">
            {d.summary_text ?? "No summary available."}
          </div>
          {d.error_message && (
            <p className="mt-3 text-sm text-rose-300 print:text-rose-700">{d.error_message}</p>
          )}
        </section>
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-600">
            Extracted context (preview)
          </h4>
          <pre className="mt-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg p-3 overflow-auto max-h-48 text-slate-400 print:text-slate-700 print:bg-slate-50 print:border-slate-200">
            {(d.raw_preview ?? "").slice(0, 8000)}
          </pre>
        </section>
      </div>
    </article>
  );
}
