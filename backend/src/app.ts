import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import type { Database } from "better-sqlite3";
import { z } from "zod";
import { getSetting, setSetting } from "./db";
import { ingestFile } from "./ingest";
import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from "./llmDefaults";

const INGESTABLE_EXTENSIONS = new Set([".json", ".hl7", ".pdf", ".txt"]);

export function createApp(db: Database) {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "active", database: "connected", timestamp: new Date().toISOString() });
  });

  const SettingsBody = z.object({
    watch_folder: z.string().nullable().optional(),
    llm_base_url: z.string().min(1).optional(),
    llm_model: z.string().min(1).optional(),
  });

  app.get("/api/settings", (_req, res) => {
    const rawWatch = getSetting(db, "watch_folder");
    const watch_folder = rawWatch && rawWatch.length > 0 ? rawWatch : null;
    const llm_base_url = getSetting(db, "llm_base_url") ?? DEFAULT_LLM_BASE_URL;
    const llm_model = getSetting(db, "llm_model") ?? DEFAULT_LLM_MODEL;
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
    if (b.watch_folder !== undefined) setSetting(db, "watch_folder", b.watch_folder ?? "");
    if (b.llm_base_url) setSetting(db, "llm_base_url", b.llm_base_url);
    if (b.llm_model) setSetting(db, "llm_model", b.llm_model);
    const wf = getSetting(db, "watch_folder");
    const watch_folder = wf && wf.length > 0 ? wf : null;
    res.json({
      watch_folder,
      llm_base_url: getSetting(db, "llm_base_url") ?? DEFAULT_LLM_BASE_URL,
      llm_model: getSetting(db, "llm_model") ?? DEFAULT_LLM_MODEL,
    });
  });

  const IngestBody = z.object({
    filePath: z.string().min(1),
  });

  app.post("/api/ingest", async (req, res) => {
    const parsed = IngestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const result = await ingestFile(db, parsed.data.filePath);
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/documents", (_req, res) => {
    const rows = db
      .prepare(
        `SELECT id, file_name, source_type, status, confidence, created_at,
        substr(summary_text, 1, 220) AS summary_preview
       FROM documents ORDER BY datetime(created_at) DESC LIMIT 200`,
      )
      .all() as {
        id: string;
        file_name: string;
        source_type: string;
        status: string;
        confidence: number | null;
        created_at: string;
        summary_preview: string | null;
      }[];
    res.json({ items: rows });
  });

  app.get("/api/documents/:id", (req, res) => {
    const row = db
      .prepare(
        `SELECT id, file_path, file_name, source_type, status, confidence, created_at,
        raw_preview, summary_text, error_message
       FROM documents WHERE id = ?`,
      )
      .get(req.params.id) as
      | {
          id: string;
          file_path: string;
          file_name: string;
          source_type: string;
          status: string;
          confidence: number | null;
          created_at: string;
          raw_preview: string | null;
          summary_text: string | null;
          error_message: string | null;
        }
      | undefined;
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
    const watchFolder = getSetting(db, "watch_folder");
    if (!watchFolder) {
      res.status(400).json({ error: "No watch folder configured" });
      return;
    }
    let queued = 0;
    try {
      const entries = fs.readdirSync(watchFolder);
      const files = entries
        .filter((e) => INGESTABLE_EXTENSIONS.has(path.extname(e).toLowerCase()))
        .map((e) => path.join(watchFolder, e));

      for (const filePath of files) {
        void ingestFile(db, filePath).catch((err: unknown) => {
          console.error(`[Sift] scan ingest error ${filePath}:`, err);
        });
        queued++;
      }
      res.json({ queued, folder: watchFolder });
    } catch (e) {
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
