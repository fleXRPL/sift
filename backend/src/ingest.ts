import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type Database from "better-sqlite3";
import { extractFromFhirJson } from "./pipelines/fhir";
import { extractFromHl7, looksLikeHl7 } from "./pipelines/hl7";
import { extractTextFromPdf } from "./pipelines/pdf";
import { getSetting } from "./db";
import { heuristicSummary, synthesizeClinical } from "./llm";
import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from "./llmDefaults";

export type IngestResult = {
  documentId: string;
  status: string;
};

function detectKind(filePath: string, rawText: string): "fhir" | "hl7" | "pdf" | "unknown" {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json" || ext === ".xml") {
    const t = rawText.trimStart();
    if (t.startsWith("{") && t.includes('"resourceType"')) return "fhir";
  }
  if (ext === ".hl7" || ext === ".txt") {
    if (looksLikeHl7(rawText)) return "hl7";
  }
  if (looksLikeHl7(rawText)) return "hl7";
  if (ext === ".pdf") return "pdf";
  if (rawText.trimStart().startsWith("{") && rawText.includes("resourceType")) return "fhir";
  return "unknown";
}

async function buildContext(
  kind: "fhir" | "hl7" | "pdf" | "unknown",
  filePath: string,
  rawText: string,
): Promise<{ preview: string; label: string; baseConfidence: number }> {
  if (kind === "fhir") {
    const ex = extractFromFhirJson(rawText);
    const preview = [ex.narrative, "", rawText.slice(0, 12000)].join("\n");
    return {
      preview,
      label: `FHIR ${ex.resourceType}`,
      baseConfidence: ex.resourceType === "Invalid" ? 0.2 : 0.85,
    };
  }
  if (kind === "hl7") {
    const ex = extractFromHl7(rawText);
    return {
      preview: ex.narrative,
      label: "HL7 v2",
      baseConfidence: 0.65,
    };
  }
  if (kind === "pdf") {
    const ex = await extractTextFromPdf(filePath);
    return {
      preview: ex.text,
      label: "PDF",
      baseConfidence: ex.confidence,
    };
  }
  return {
    preview: rawText.slice(0, 16000),
    label: "Unknown text",
    baseConfidence: 0.4,
  };
}

export async function ingestFile(db: Database.Database, filePath: string): Promise<IngestResult> {
  const normalized = path.resolve(filePath);
  if (!fs.existsSync(normalized)) {
    throw new Error(`File not found: ${normalized}`);
  }
  const stat = fs.statSync(normalized);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${normalized}`);
  }

  const id = uuidv4();
  const fileName = path.basename(normalized);
  const ext = path.extname(normalized).toLowerCase();

  let rawText = "";
  if (ext !== ".pdf") {
    try {
      rawText = fs.readFileSync(normalized, "utf8");
    } catch {
      rawText = "";
    }
  }

  const kind = ext === ".pdf" ? "pdf" : detectKind(normalized, rawText);

  // Write a 'processing' row immediately so the UI shows the file right away.
  db.prepare(
    `INSERT INTO documents (id, file_path, file_name, source_type, status)
     VALUES (?, ?, ?, ?, 'processing')`,
  ).run(id, normalized, fileName, kind);

  const ctx = await buildContext(kind, normalized, rawText);

  const llmBase = getSetting(db, "llm_base_url") ?? process.env.SIFT_LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL;
  const llmModel = getSetting(db, "llm_model") ?? process.env.SIFT_LLM_MODEL ?? DEFAULT_LLM_MODEL;

  let summary: string;
  let confidence = ctx.baseConfidence;
  let err: string | null = null;

  try {
    const syn = await synthesizeClinical({
      baseUrl: llmBase,
      model: llmModel,
      sourceLabel: ctx.label,
      rawContext: ctx.preview,
    });
    summary = syn.text;
    confidence = Math.min(0.95, confidence + 0.05);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
    summary = heuristicSummary(ctx.label, ctx.preview);
    confidence = Math.max(0.15, confidence - 0.25);
  }

  db.prepare(
    `UPDATE documents
     SET status = 'complete', raw_preview = ?, summary_text = ?, confidence = ?, error_message = ?
     WHERE id = ?`,
  ).run(ctx.preview.slice(0, 65000), summary, confidence, err, id);

  return { documentId: id, status: "complete" };
}
