import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../app";
import { openMemoryDatabase } from "../db";

describe("createApp HTTP API", () => {
  let db: ReturnType<typeof openMemoryDatabase>;

  beforeEach(() => {
    db = openMemoryDatabase();
  });

  afterEach(() => {
    db.close();
  });

  // ── Health ────────────────────────────────────────────────────────────────

  it("GET /health returns active", async () => {
    const app = createApp(db);
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("active");
    expect(res.body.database).toBe("connected");
    expect(typeof res.body.timestamp).toBe("string");
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  it("GET /api/settings returns defaults", async () => {
    const app = createApp(db);
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.watch_folder).toBeNull();
    expect(res.body.llm_base_url).toContain("11434");
    expect(res.body.llm_model).toBeTruthy();
  });

  it("POST /api/settings persists values", async () => {
    const app = createApp(db);
    await request(app)
      .post("/api/settings")
      .send({ watch_folder: "/tmp/sift-records", llm_base_url: "http://127.0.0.1:9999/v1", llm_model: "m1" })
      .expect(200);

    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.watch_folder).toBe("/tmp/sift-records");
    expect(res.body.llm_base_url).toBe("http://127.0.0.1:9999/v1");
    expect(res.body.llm_model).toBe("m1");
  });

  it("POST /api/settings clears watch_folder to null when sent null", async () => {
    const app = createApp(db);
    await request(app).post("/api/settings").send({ watch_folder: "/tmp/somewhere" }).expect(200);
    await request(app).post("/api/settings").send({ watch_folder: null }).expect(200);
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.watch_folder).toBeNull();
  });

  it("POST /api/settings returns 400 for invalid body", async () => {
    const app = createApp(db);
    await request(app).post("/api/settings").send({ llm_base_url: "" }).expect(400);
  });

  // ── Documents list / detail ───────────────────────────────────────────────

  it("GET /api/documents returns empty list initially", async () => {
    const app = createApp(db);
    const res = await request(app).get("/api/documents").expect(200);
    expect(res.body.items).toEqual([]);
  });

  it("GET /api/documents/:id returns 404 for unknown id", async () => {
    const app = createApp(db);
    await request(app).get("/api/documents/not-a-real-id").expect(404);
  });

  // ── Ingest ────────────────────────────────────────────────────────────────

  it("POST /api/ingest returns 400 on invalid body", async () => {
    const app = createApp(db);
    await request(app).post("/api/ingest").send({}).expect(400);
  });

  it("POST /api/ingest writes processing row immediately then completes", async () => {
    const mockFetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setImmediate(() =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ choices: [{ message: { content: "LLM summary." } }] }),
            }),
          ),
        ),
    );
    const prev = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sift-test-"));
    const filePath = path.join(dir, "bundle.json");
    fs.writeFileSync(
      filePath,
      JSON.stringify({ resourceType: "Bundle", entry: [{ resource: { resourceType: "Patient", id: "p1" } }] }),
      "utf8",
    );

    try {
      const app = createApp(db);
      const res = await request(app).post("/api/ingest").send({ filePath }).expect(200);
      expect(res.body.documentId).toBeTruthy();
      expect(res.body.status).toBe("complete");

      const doc = await request(app).get(`/api/documents/${res.body.documentId}`).expect(200);
      expect(doc.body.status).toBe("complete");
      expect(doc.body.summary_text).toContain("LLM summary");
    } finally {
      globalThis.fetch = prev;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("POST /api/ingest returns 500 for a missing file", async () => {
    const app = createApp(db);
    await request(app)
      .post("/api/ingest")
      .send({ filePath: "/nonexistent/path/file.json" })
      .expect(500);
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it("DELETE /api/documents/:id removes the document", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "summary" } }] }),
    });
    const prev = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sift-test-"));
    const filePath = path.join(dir, "bundle.json");
    fs.writeFileSync(
      filePath,
      JSON.stringify({ resourceType: "Bundle", entry: [] }),
      "utf8",
    );

    try {
      const app = createApp(db);
      const ingestRes = await request(app).post("/api/ingest").send({ filePath }).expect(200);
      const { documentId } = ingestRes.body as { documentId: string };

      await request(app).delete(`/api/documents/${documentId}`).expect(200);
      await request(app).get(`/api/documents/${documentId}`).expect(404);

      const list = await request(app).get("/api/documents").expect(200);
      expect(list.body.items).toEqual([]);
    } finally {
      globalThis.fetch = prev;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("DELETE /api/documents/:id returns 404 for unknown id", async () => {
    const app = createApp(db);
    await request(app).delete("/api/documents/does-not-exist").expect(404);
  });

  // ── Scan ──────────────────────────────────────────────────────────────────

  it("POST /api/scan returns 400 when no watch folder is configured", async () => {
    const app = createApp(db);
    await request(app).post("/api/scan").expect(400);
  });

  it("POST /api/scan queues all ingestable files in watch folder", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "summary" } }] }),
    });
    const prev = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sift-scan-"));
    fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify({ resourceType: "Bundle", entry: [] }), "utf8");
    fs.writeFileSync(path.join(dir, "b.hl7"), "MSH|^~\\&|A|B|C|D|20240101||ORU^R01|1|P|2.5\rPID|1||123", "utf8");
    fs.writeFileSync(path.join(dir, "ignore.md"), "# not a clinical file", "utf8");

    try {
      const app = createApp(db);
      await request(app).post("/api/settings").send({ watch_folder: dir }).expect(200);

      const res = await request(app).post("/api/scan").expect(200);
      expect(res.body.queued).toBe(2);
    } finally {
      globalThis.fetch = prev;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
