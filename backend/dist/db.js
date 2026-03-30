"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSchema = ensureSchema;
exports.openDatabase = openDatabase;
exports.openMemoryDatabase = openMemoryDatabase;
exports.getSetting = getSetting;
exports.setSetting = setSetting;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
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
function resolveDataDir() {
    const env = process.env.SIFT_DATA_DIR;
    if (env)
        return env;
    return path_1.default.join(process.cwd(), "..", "data");
}
function ensureSchema(db) {
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA_SQL);
}
function openDatabase() {
    const dataDir = resolveDataDir();
    if (!fs_1.default.existsSync(dataDir))
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    const db = new better_sqlite3_1.default(path_1.default.join(dataDir, "sift.db"));
    ensureSchema(db);
    return db;
}
/** In-memory SQLite for tests (same schema as on-disk). */
function openMemoryDatabase() {
    const db = new better_sqlite3_1.default(":memory:");
    ensureSchema(db);
    return db;
}
function getSetting(db, key) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row?.value ?? null;
}
function setSetting(db, key, value) {
    db.prepare("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}
