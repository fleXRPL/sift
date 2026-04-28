"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const db_1 = require("./db");
const ingest_1 = require("./ingest");
const llmDefaults_1 = require("./llmDefaults");
const INGESTABLE_EXTENSIONS = new Set([".json", ".hl7", ".pdf", ".txt"]);
function createApp(db) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: true }));
    app.use(express_1.default.json({ limit: "2mb" }));
    app.get("/health", (_req, res) => {
        res.json({ status: "active", database: "connected", timestamp: new Date().toISOString() });
    });
    const SettingsBody = zod_1.z.object({
        watch_folder: zod_1.z.string().nullable().optional(),
        llm_base_url: zod_1.z.string().min(1).optional(),
        llm_model: zod_1.z.string().min(1).optional(),
    });
    app.get("/api/settings", (_req, res) => {
        const rawWatch = (0, db_1.getSetting)(db, "watch_folder");
        const watch_folder = rawWatch && rawWatch.length > 0 ? rawWatch : null;
        const llm_base_url = (0, db_1.getSetting)(db, "llm_base_url") ?? llmDefaults_1.DEFAULT_LLM_BASE_URL;
        const llm_model = (0, db_1.getSetting)(db, "llm_model") ?? llmDefaults_1.DEFAULT_LLM_MODEL;
        res.json({
            watch_folder,
            llm_base_url,
            llm_model,
        });
    });
    app.post("/api/settings", (req, res) => {
        const parsed = SettingsBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const b = parsed.data;
        if (b.watch_folder !== undefined)
            (0, db_1.setSetting)(db, "watch_folder", b.watch_folder ?? "");
        if (b.llm_base_url)
            (0, db_1.setSetting)(db, "llm_base_url", b.llm_base_url);
        if (b.llm_model)
            (0, db_1.setSetting)(db, "llm_model", b.llm_model);
        const wf = (0, db_1.getSetting)(db, "watch_folder");
        const watch_folder = wf && wf.length > 0 ? wf : null;
        res.json({
            watch_folder,
            llm_base_url: (0, db_1.getSetting)(db, "llm_base_url") ?? llmDefaults_1.DEFAULT_LLM_BASE_URL,
            llm_model: (0, db_1.getSetting)(db, "llm_model") ?? llmDefaults_1.DEFAULT_LLM_MODEL,
        });
    });
    const IngestBody = zod_1.z.object({
        filePath: zod_1.z.string().min(1),
    });
    app.post("/api/ingest", async (req, res) => {
        const parsed = IngestBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        try {
            const result = await (0, ingest_1.ingestFile)(db, parsed.data.filePath);
            res.json(result);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            res.status(500).json({ error: msg });
        }
    });
    app.get("/api/documents", (_req, res) => {
        const rows = db
            .prepare(`SELECT id, file_name, source_type, status, confidence, created_at,
        substr(summary_text, 1, 220) AS summary_preview
       FROM documents ORDER BY datetime(created_at) DESC LIMIT 200`)
            .all();
        res.json({ items: rows });
    });
    app.get("/api/documents/:id", (req, res) => {
        const row = db
            .prepare(`SELECT id, file_path, file_name, source_type, status, confidence, created_at,
        raw_preview, summary_text, error_message
       FROM documents WHERE id = ?`)
            .get(req.params.id);
        if (!row) {
            res.status(404).json({ error: "not found" });
            return;
        }
        res.json({
            ...row,
            summary_preview: row.summary_text ? row.summary_text.slice(0, 220) : null,
        });
    });
    app.delete("/api/documents/:id", (req, res) => {
        const { changes } = db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
        if (changes === 0) {
            res.status(404).json({ error: "not found" });
            return;
        }
        res.json({ deleted: req.params.id });
    });
    app.post("/api/scan", async (_req, res) => {
        const watchFolder = (0, db_1.getSetting)(db, "watch_folder");
        if (!watchFolder) {
            res.status(400).json({ error: "No watch folder configured" });
            return;
        }
        let queued = 0;
        try {
            const entries = node_fs_1.default.readdirSync(watchFolder);
            const files = entries
                .filter((e) => INGESTABLE_EXTENSIONS.has(node_path_1.default.extname(e).toLowerCase()))
                .map((e) => node_path_1.default.join(watchFolder, e));
            for (const filePath of files) {
                void (0, ingest_1.ingestFile)(db, filePath).catch((err) => {
                    console.error(`[Sift] scan ingest error ${filePath}:`, err);
                });
                queued++;
            }
            res.json({ queued, folder: watchFolder });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            res.status(500).json({ error: msg });
        }
    });
    app.post("/ingest", (req, res) => {
        const fileName = typeof req.body?.fileName === "string" ? req.body.fileName : "";
        console.log(`[Sift] legacy ingest ping: ${fileName}`);
        res.json({ message: "Use POST /api/ingest with filePath" });
    });
    return app;
}
