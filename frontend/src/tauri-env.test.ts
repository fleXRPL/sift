import { describe, it, expect } from "vitest";
import { isTauriRuntime } from "./tauri-env";

describe("isTauriRuntime", () => {
  it("returns false in a normal jsdom environment", () => {
    expect(isTauriRuntime()).toBe(false);
  });
});
