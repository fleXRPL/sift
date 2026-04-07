import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ingestFile } from "../ingest";
import { openMemoryDatabase } from "../db";

const FHIR_BUNDLE = JSON.stringify({
  resourceType: "Bundle",
  entry: [
    {
      resource: {
        resourceType: "Patient",
        id: "p1",
        name: [{ family: "Smith", given: ["Alice"] }],
        birthDate: "1970-05-01",
      },
    },
  ],
});

const HL7_MSG = [
  String.raw`MSH|^~\&|EPIC|HOSP|LAB|FAC|20260101||ORU^R01|1|P|2.5`,
  "PID|1||MRN99^^^MRN||Smith^Alice||19700501|F",
  "OBR|1|ORD001||80053^CMP^CPT",
  "OBX|1|NM|2160-0^Creatinine^LN||1.1|mg/dL|0.7-1.3||||F",
].join("\r");

function makeTempFile(content: string, ext: string): { filePath: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sift-ingest-"));
  const filePath = path.join(dir, `test${ext}`);
  fs.writeFileSync(filePath, content, "utf8");
  return { filePath, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

describe("ingestFile", () => {
  let db: ReturnType<typeof openMemoryDatabase>;

  beforeEach(() => {
    db = openMemoryDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("throws when file does not exist", async () => {
    await expect(ingestFile(db, "/nonexistent/path/file.json")).rejects.toThrow(/not found/i);
  });

  it("throws when path points to a directory", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sift-dir-"));
    try {
      await expect(ingestFile(db, dir)).rejects.toThrow(/not a file/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("inserts a processing row immediately, then completes with LLM summary", async () => {
    const { filePath, cleanup } = makeTempFile(FHIR_BUNDLE, ".json");
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "Alice Smith — FHIR summary." } }] }),
    });
    const prev = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const result = await ingestFile(db, filePath);

      expect(result.status).toBe("complete");
      expect(result.documentId).toBeTruthy();

      const row = db
        .prepare("SELECT status, summary_text, source_type FROM documents WHERE id = ?")
        .get(result.documentId) as { status: string; summary_text: string; source_type: string };

      expect(row.status).toBe("complete");
      expect(row.summary_text).toContain("Alice Smith");
      expect(row.source_type).toBe("fhir");
    } finally {
      globalThis.fetch = prev;
      cleanup();
    }
  });

  it("falls back to heuristic summary when LLM call fails", async () => {
    const { filePath, cleanup } = makeTempFile(FHIR_BUNDLE, ".json");
    const mockFetch = jest.fn().mockRejectedValue(new Error("LLM unavailable"));
    const prev = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const result = await ingestFile(db, filePath);

      expect(result.status).toBe("complete");

      const row = db
        .prepare("SELECT status, summary_text, error_message, confidence FROM documents WHERE id = ?")
        .get(result.documentId) as {
          status: string;
          summary_text: string;
          error_message: string;
          confidence: number;
        };

      expect(row.status).toBe("complete");
      expect(row.summary_text).toBeTruthy();
      expect(row.error_message).toContain("LLM unavailable");
      expect(row.confidence).toBeLessThanOrEqual(0.6);
    } finally {
      globalThis.fetch = prev;
      cleanup();
    }
  });

  it("correctly detects HL7 v2 source type", async () => {
    const { filePath, cleanup } = makeTempFile(HL7_MSG, ".hl7");
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "HL7 summary." } }] }),
    });
    const prev = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const result = await ingestFile(db, filePath);
      const row = db
        .prepare("SELECT source_type FROM documents WHERE id = ?")
        .get(result.documentId) as { source_type: string };
      expect(row.source_type).toBe("hl7");
    } finally {
      globalThis.fetch = prev;
      cleanup();
    }
  });

  it("stores raw_preview truncated to 65000 chars", async () => {
    const longContent = JSON.stringify({
      resourceType: "Bundle",
      entry: [],
      longField: "x".repeat(70000),
    });
    const { filePath, cleanup } = makeTempFile(longContent, ".json");
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "summary" } }] }),
    });
    const prev = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const result = await ingestFile(db, filePath);
      const row = db
        .prepare("SELECT length(raw_preview) AS len FROM documents WHERE id = ?")
        .get(result.documentId) as { len: number };
      expect(row.len).toBeLessThanOrEqual(65000);
    } finally {
      globalThis.fetch = prev;
      cleanup();
    }
  });
});
