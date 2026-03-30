const base = () => import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:4000";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${base()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json() as Promise<T>;
}

export type Health = {
  status: string;
  database: string;
  timestamp: string;
};

export type Settings = {
  watch_folder: string | null;
  llm_base_url: string;
  llm_model: string;
};

export type DocumentRow = {
  id: string;
  file_name: string;
  source_type: string;
  status: string;
  confidence: number | null;
  created_at: string;
  summary_preview: string | null;
};

export type DocumentDetail = DocumentRow & {
  file_path: string;
  raw_preview: string | null;
  summary_text: string | null;
  error_message: string | null;
};

export const api = {
  health: () => j<Health>("/health"),
  getSettings: () => j<Settings>("/api/settings"),
  saveSettings: (body: Partial<Settings>) =>
    j<Settings>("/api/settings", { method: "POST", body: JSON.stringify(body) }),
  listDocuments: () => j<{ items: DocumentRow[] }>("/api/documents"),
  getDocument: (id: string) => j<DocumentDetail>(`/api/documents/${id}`),
  ingestPath: (filePath: string) =>
    j<{ documentId: string; status: string }>("/api/ingest", {
      method: "POST",
      body: JSON.stringify({ filePath }),
    }),
};
