import { describe, expect, it, vi } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("path", async () => {
  // use real path for join/resolve but allow predictable resolve root
  const actual = (await vi.importActual<typeof import("path")>("path")) as typeof import("path");
  return {
    ...actual,
    resolve: vi.fn(() => "/repo"),
  };
});

import * as fs from "fs";
import { readBundledAsset } from "./downloader";

describe("downloader", () => {
  describe("readBundledAsset", () => {
    it("returns null when asset does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(readBundledAsset("missing.json")).toBeNull();
    });

    it("returns file content when asset exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("{\"ok\":true}");

      expect(readBundledAsset("valid-config.json")).toBe("{\"ok\":true}");
      const readCall = vi.mocked(fs.readFileSync).mock.calls[0];
      expect(readCall[0]).toContain("shared");
      expect(readCall[0]).toContain("assets");
      expect(readCall[0]).toContain("valid-config.json");
    });
  });
});
