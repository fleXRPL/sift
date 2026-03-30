"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestFile = ingestFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fhir_1 = require("./pipelines/fhir");
const hl7_1 = require("./pipelines/hl7");
const pdf_1 = require("./pipelines/pdf");
const db_1 = require("./db");
const llm_1 = require("./llm");
function detectKind(filePath, rawText) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === ".json" || ext === ".xml") {
        const t = rawText.trimStart();
        if (t.startsWith("{") && (t.includes('"resourceType"') || t.includes('"resourceType"')))
            return "fhir";
    }
    if (ext === ".hl7" || ext === ".txt") {
        if ((0, hl7_1.looksLikeHl7)(rawText))
            return "hl7";
    }
    if ((0, hl7_1.looksLikeHl7)(rawText))
        return "hl7";
    if (ext === ".pdf")
        return "pdf";
    if (rawText.trimStart().startsWith("{") && rawText.includes("resourceType"))
        return "fhir";
    return "unknown";
}
async function buildContext(kind, filePath, rawText) {
    if (kind === "fhir") {
        const ex = (0, fhir_1.extractFromFhirJson)(rawText);
        const preview = [ex.narrative, "", rawText.slice(0, 12000)].join("\n");
        return {
            preview,
            label: `FHIR ${ex.resourceType}`,
            baseConfidence: ex.resourceType === "Invalid" ? 0.2 : 0.85,
        };
    }
    if (kind === "hl7") {
        const ex = (0, hl7_1.extractFromHl7)(rawText);
        return {
            preview: ex.narrative,
            label: "HL7 v2",
            baseConfidence: 0.65,
        };
    }
    if (kind === "pdf") {
        const ex = await (0, pdf_1.extractTextFromPdf)(filePath);
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
async function ingestFile(db, filePath) {
    const normalized = path_1.default.resolve(filePath);
    if (!fs_1.default.existsSync(normalized)) {
        throw new Error(`File not found: ${normalized}`);
    }
    const stat = fs_1.default.statSync(normalized);
    if (!stat.isFile()) {
        throw new Error(`Not a file: ${normalized}`);
    }
    const id = (0, uuid_1.v4)();
    const fileName = path_1.default.basename(normalized);
    const ext = path_1.default.extname(normalized).toLowerCase();
    let rawText = "";
    if (ext !== ".pdf") {
        try {
            rawText = fs_1.default.readFileSync(normalized, "utf8");
        }
        catch {
            rawText = "";
        }
    }
    const kind = ext === ".pdf" ? "pdf" : detectKind(normalized, rawText);
    const ctx = await buildContext(kind, normalized, rawText);
    const llmBase = (0, db_1.getSetting)(db, "llm_base_url") ?? process.env.SIFT_LLM_BASE_URL ?? "http://127.0.0.1:8080/v1";
    const llmModel = (0, db_1.getSetting)(db, "llm_model") ?? process.env.SIFT_LLM_MODEL ?? "gpt-oss-20b";
    let summary;
    let confidence = ctx.baseConfidence;
    let err = null;
    try {
        const syn = await (0, llm_1.synthesizeClinical)({
            baseUrl: llmBase,
            model: llmModel,
            sourceLabel: ctx.label,
            rawContext: ctx.preview,
        });
        summary = syn.text;
        confidence = Math.min(0.95, confidence + 0.05);
    }
    catch (e) {
        err = e instanceof Error ? e.message : String(e);
        summary = (0, llm_1.heuristicSummary)(ctx.label, ctx.preview);
        confidence = Math.max(0.15, confidence - 0.25);
    }
    db.prepare(`INSERT INTO documents (
      id, file_path, file_name, source_type, status, raw_preview, summary_text, confidence, error_message
    ) VALUES (?, ?, ?, ?, 'complete', ?, ?, ?, ?)`).run(id, normalized, fileName, kind, ctx.preview.slice(0, 65000), summary, confidence, err);
    return { documentId: id, status: "complete" };
}
