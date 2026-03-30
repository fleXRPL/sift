import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export type DocumentRecord = {
  id: string;
  file_path: string;
  file_name: string;
  source_type: string;
  status: string;
  raw_preview: string | null;
  summary_text: string | null;
  confidence: number | null;
  error_message: string | null;
  created_at: string;
};

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    raw_preview TEXT,
    summary_text TEXT,
    confidence REAL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
`;

function resolveDataDir(): string {
  const env = process.env.SIFT_DATA_DIR;
  if (env) return env;
  return path.join(process.cwd(), "..", "data");
}

export function ensureSchema(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA_SQL);
}

export function openDatabase() {
  const dataDir = resolveDataDir();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "sift.db"));
  ensureSchema(db);
  return db;
}

/** In-memory SQLite for tests (same schema as on-disk). */
export function openMemoryDatabase() {
  const db = new Database(":memory:");
  ensureSchema(db);
  return db;
}

export function getSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(db: Database.Database, key: string, value: string) {
  db.prepare(
    "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}
