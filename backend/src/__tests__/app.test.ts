import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
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

  it("GET /health returns active", async () => {
    const app = createApp(db);
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("active");
    expect(res.body.database).toBe("connected");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("GET /api/settings returns defaults", async () => {
    const app = createApp(db);
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.watch_folder).toBeNull();
    expect(res.body.llm_base_url).toContain("11434");
    expect(res.body.llm_model).toBeTruthy();
  });

  it("POST /api/settings persists watch_folder and clears to null when empty", async () => {
    const app = createApp(db);
    await request(app)
      .post("/api/settings")
      .send({ watch_folder: "/tmp/sift-records", llm_base_url: "http://127.0.0.1:9999/v1", llm_model: "m1" })
      .expect(200);

    const get1 = await request(app).get("/api/settings").expect(200);
    expect(get1.body.watch_folder).toBe("/tmp/sift-records");
    expect(get1.body.llm_base_url).toBe("http://127.0.0.1:9999/v1");

    await request(app).post("/api/settings").send({ watch_folder: null }).expect(200);
    const get2 = await request(app).get("/api/settings").expect(200);
    expect(get2.body.watch_folder).toBeNull();
  });

  it("POST /api/ingest returns 400 on invalid body", async () => {
    const app = createApp(db);
    await request(app).post("/api/ingest").send({}).expect(400);
  });

  it("POST /api/ingest ingests a minimal FHIR JSON file when LLM responds", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Unit test LLM summary." } }],
      }),
    });
    const prev = global.fetch;
    global.fetch = mockFetch as typeof fetch;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sift-test-"));
    const filePath = path.join(dir, "bundle.json");
    const bundle = {
      resourceType: "Bundle",
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: "p1",
            name: [{ family: "Test", given: ["Pat"] }],
          },
        },
      ],
    };
    fs.writeFileSync(filePath, JSON.stringify(bundle), "utf8");

    try {
      const app = createApp(db);
      const res = await request(app).post("/api/ingest").send({ filePath }).expect(200);
      expect(res.body.documentId).toBeTruthy();
      expect(res.body.status).toBe("complete");

      const list = await request(app).get("/api/documents").expect(200);
      expect(list.body.items.length).toBe(1);

      const doc = await request(app).get(`/api/documents/${res.body.documentId}`).expect(200);
      expect(doc.body.file_name).toBe("bundle.json");
      expect(doc.body.source_type).toBe("fhir");
      expect(doc.body.summary_text).toContain("Unit test LLM summary");
    } finally {
      global.fetch = prev;
      mockFetch.mockClear();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("GET /api/documents/:id returns 404 for unknown id", async () => {
    const app = createApp(db);
    await request(app).get("/api/documents/not-a-real-id").expect(404);
  });
});
