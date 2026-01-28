import { beforeEach, describe, expect, it, vi } from "vitest";
import * as path from "path";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("../utils/scope-resolver", () => ({
  loadProjectRc: vi.fn(),
}));

import * as fs from "fs";
import { loadProjectRc } from "../utils/scope-resolver";
import { SettingsManager } from "./settings-manager";

describe("SettingsManager", () => {
  let manager: SettingsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SettingsManager();
  });

  describe("loadSettings", () => {
    it("returns default settings when file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const settings = manager.loadSettings();

      expect(settings.activeType).toBe("omo");
    });

    it("returns settings from file when it exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ activeType: "slim" }));

      const settings = manager.loadSettings();

      expect(settings.activeType).toBe("slim");
    });

    it("returns default settings when file is invalid JSON", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("invalid json");

      const settings = manager.loadSettings();

      expect(settings.activeType).toBe("omo");
    });

    it("uses default activeType when field is missing", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));

      const settings = manager.loadSettings();

      expect(settings.activeType).toBe("omo");
    });
  });

  describe("saveSettings", () => {
    it("creates directory if it does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      manager.saveSettings({ activeType: "slim" });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it("writes settings to file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      manager.saveSettings({ activeType: "slim" });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("settings.json"),
        expect.stringContaining('"activeType": "slim"'),
        "utf-8"
      );
    });
  });

  describe("getEffectiveType", () => {
    it("returns project type when set in project .omorc", () => {
      vi.mocked(loadProjectRc).mockReturnValue({
        activeProfileId: null,
        type: "slim",
      });
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const type = manager.getEffectiveType("/project");

      expect(type).toBe("slim");
    });

    it("falls back to global settings when project type is not set", () => {
      vi.mocked(loadProjectRc).mockReturnValue({
        activeProfileId: null,
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ activeType: "slim" }));

      const type = manager.getEffectiveType("/project");

      expect(type).toBe("slim");
    });

    it("returns omo when nothing is set", () => {
      vi.mocked(loadProjectRc).mockReturnValue(null);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const type = manager.getEffectiveType("/project");

      expect(type).toBe("omo");
    });

    it("returns global type when no project root is provided", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ activeType: "slim" }));

      const type = manager.getEffectiveType();

      expect(type).toBe("slim");
      expect(loadProjectRc).not.toHaveBeenCalled();
    });
  });

  describe("isProjectOverride", () => {
    it("returns true when project has type override", () => {
      vi.mocked(loadProjectRc).mockReturnValue({
        activeProfileId: null,
        type: "slim",
      });

      const isOverride = manager.isProjectOverride("/project");

      expect(isOverride).toBe(true);
    });

    it("returns false when project has no type override", () => {
      vi.mocked(loadProjectRc).mockReturnValue({
        activeProfileId: null,
      });

      const isOverride = manager.isProjectOverride("/project");

      expect(isOverride).toBe(false);
    });

    it("returns false when no project root provided", () => {
      const isOverride = manager.isProjectOverride();

      expect(isOverride).toBe(false);
    });
  });

  describe("setActiveType", () => {
    it("persists type to settings file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ activeType: "omo" }));

      manager.setActiveType("slim");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("settings.json"),
        expect.stringContaining('"activeType": "slim"'),
        "utf-8"
      );
    });
  });
});
