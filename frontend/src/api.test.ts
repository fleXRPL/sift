import { describe, it, expect, afterEach, vi } from "vitest";
import { api } from "./api";

function mockFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(ok ? "" : JSON.stringify(body)),
  });
}

describe("api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  // ── health ────────────────────────────────────────────────────────────────

  it("health() calls /health and returns body", async () => {
    const payload = { status: "active", database: "connected", timestamp: "2026-01-01T00:00:00.000Z" };
    vi.stubGlobal("fetch", mockFetch(payload));
    const h = await api.health();
    expect(h.status).toBe("active");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  // ── settings ──────────────────────────────────────────────────────────────

  it("getSettings() calls GET /api/settings", async () => {
    const payload = { watch_folder: "/tmp/records", llm_base_url: "http://127.0.0.1:11434/v1", llm_model: "llama3.2" };
    vi.stubGlobal("fetch", mockFetch(payload));
    const s = await api.getSettings();
    expect(s.watch_folder).toBe("/tmp/records");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/settings$/),
      expect.any(Object),
    );
  });

  it("saveSettings() sends POST with body", async () => {
    const payload = { watch_folder: "/new", llm_base_url: "http://127.0.0.1:11434/v1", llm_model: "llama3.2" };
    vi.stubGlobal("fetch", mockFetch(payload));
    await api.saveSettings({ watch_folder: "/new" });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/settings$/),
      expect.objectContaining({ method: "POST", body: expect.stringContaining("/new") }),
    );
  });

  // ── documents ─────────────────────────────────────────────────────────────

  it("listDocuments() calls GET /api/documents", async () => {
    vi.stubGlobal("fetch", mockFetch({ items: [] }));
    const result = await api.listDocuments();
    expect(result.items).toEqual([]);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/documents$/),
      expect.any(Object),
    );
  });

  it("getDocument() calls GET /api/documents/:id", async () => {
    const doc = {
      id: "abc-123",
      file_name: "bundle.json",
      file_path: "/tmp/bundle.json",
      source_type: "fhir",
      status: "complete",
      confidence: 0.9,
      created_at: "2026-01-01T00:00:00.000Z",
      raw_preview: "raw",
      summary_text: "summary",
      summary_preview: "summary",
      error_message: null,
    };
    vi.stubGlobal("fetch", mockFetch(doc));
    const result = await api.getDocument("abc-123");
    expect(result.file_name).toBe("bundle.json");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/documents\/abc-123$/),
      expect.any(Object),
    );
  });

  // ── ingest ────────────────────────────────────────────────────────────────

  it("ingestPath() sends POST /api/ingest with filePath", async () => {
    vi.stubGlobal("fetch", mockFetch({ documentId: "xyz", status: "complete" }));
    const result = await api.ingestPath("/tmp/test.json");
    expect(result.documentId).toBe("xyz");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ingest$/),
      expect.objectContaining({ method: "POST", body: expect.stringContaining("/tmp/test.json") }),
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it("deleteDocument() sends DELETE /api/documents/:id", async () => {
    vi.stubGlobal("fetch", mockFetch({ deleted: "abc-123" }));
    const result = await api.deleteDocument("abc-123");
    expect(result.deleted).toBe("abc-123");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/documents\/abc-123$/),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  // ── error handling ────────────────────────────────────────────────────────

  it("throws when response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "not found" }, false));
    await expect(api.getDocument("bad-id")).rejects.toThrow();
  });
});
