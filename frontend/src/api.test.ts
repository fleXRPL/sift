import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api } from "./api";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "active",
            database: "connected",
            timestamp: "2026-01-01T00:00:00.000Z",
          }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("health calls /health", async () => {
    const h = await api.health();
    expect(h.status).toBe("active");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
