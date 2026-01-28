import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockProcessExit } from "../test-setup";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("ora", () => {
  const mockSpinner: any = {
    start: vi.fn(function (this: any) {
      this.running = true;
      return this;
    }),
    text: "",
    succeed: vi.fn(function (this: any) {
      this.running = false;
      return this;
    }),
    fail: vi.fn(function (this: any) {
      this.running = false;
      return this;
    }),
    info: vi.fn(function (this: any) {
      this.running = false;
      return this;
    }),
    stop: vi.fn(function (this: any) {
      this.running = false;
      return this;
    }),
  };
  return {
    default: vi.fn(() => mockSpinner),
  };
});

vi.mock("chalk", () => ({
  default: {
    cyan: vi.fn((s: string) => s),
    gray: vi.fn((s: string) => s),
    red: vi.fn((s: string) => s),
    green: vi.fn((s: string) => s),
    yellow: vi.fn((s: string) => s),
  },
}));

vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(),
}));

vi.mock("../store", () => ({
  SettingsManager: class {
    loadSettings() {
      return { activeType: "omo" };
    }
    saveSettings() {}
    getEffectiveType() {
      return "omo";
    }
    isProjectOverride() {
      return false;
    }
    setActiveType() {}
  },
  ProjectStoreManager: class {
    constructor(_projectRoot: string) {}
    ensureDirectories() {}
    loadRc() {
      return { activeProfileId: null };
    }
    saveRc() {}
  },
}));

vi.mock("../utils/scope-resolver", () => ({
  findProjectRoot: vi.fn(() => null),
  loadProjectRc: vi.fn(() => null),
  saveProjectRc: vi.fn(),
}));

import * as fs from "fs";
import ora from "ora";
import { select } from "@inquirer/prompts";
import { findProjectRoot, loadProjectRc } from "../utils/scope-resolver";

describe("typeCommand", () => {
  let mockSpinner: any;
  let typeCommand: any;
  let SettingsManagerClass: any;
  let ProjectStoreManagerClass: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockProcessExit();

    mockSpinner = vi.mocked(ora)();

    const storeModule = await import("../store");
    SettingsManagerClass = storeModule.SettingsManager;
    ProjectStoreManagerClass = storeModule.ProjectStoreManager;

    const mod = await import("./type");
    typeCommand = mod.typeCommand;
  });

  async function runType(
    type?: string,
    opts: { scope?: string; select?: boolean; clearProject?: boolean } = {}
  ) {
    const cmd = typeCommand as any;
    cmd._optionValues = {};
    cmd._optionValueSources = {};

    if (opts.scope) {
      cmd._optionValues.scope = opts.scope;
      cmd._optionValueSources.scope = "cli";
    }
    if (opts.select) {
      cmd._optionValues.select = true;
      cmd._optionValueSources.select = "cli";
    }
    if (opts.clearProject) {
      cmd._optionValues.clearProject = true;
      cmd._optionValueSources.clearProject = "cli";
    }

    cmd.processedArgs = type ? [type] : [];

    try {
      await cmd._actionHandler(cmd.processedArgs);
    } catch (err: any) {
      if (err.message?.includes?.("process.exit")) {
        return;
      }
      throw err;
    }
  }

  describe("show current type", () => {
    it("shows current type when no argument provided", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(SettingsManagerClass.prototype, "getEffectiveType").mockReturnValue("omo");
      vi.spyOn(SettingsManagerClass.prototype, "isProjectOverride").mockReturnValue(false);
      vi.spyOn(SettingsManagerClass.prototype, "loadSettings").mockReturnValue({ activeType: "omo" });

      await runType();

      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Current type:"));
      consoleSpy.mockRestore();
    });

    it("shows project override indicator when project type is set", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      vi.mocked(findProjectRoot).mockReturnValue("/project");
      vi.spyOn(SettingsManagerClass.prototype, "getEffectiveType").mockReturnValue("slim");
      vi.spyOn(SettingsManagerClass.prototype, "isProjectOverride").mockReturnValue(true);
      vi.spyOn(SettingsManagerClass.prototype, "loadSettings").mockReturnValue({ activeType: "omo" });
      vi.mocked(loadProjectRc).mockReturnValue({ activeProfileId: null, type: "slim" });

      await runType();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("project override"));
      consoleSpy.mockRestore();
    });
  });

  describe("set global type", () => {
    it("sets global type to omo", async () => {
      const setActiveTypeSpy = vi.spyOn(SettingsManagerClass.prototype, "setActiveType");

      await runType("omo");

      expect(setActiveTypeSpy).toHaveBeenCalledWith("omo");
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("omo"));
    });

    it("sets global type to slim", async () => {
      const setActiveTypeSpy = vi.spyOn(SettingsManagerClass.prototype, "setActiveType");

      await runType("slim");

      expect(setActiveTypeSpy).toHaveBeenCalledWith("slim");
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("slim"));
    });

    it("errors on invalid type", async () => {
      await runType("invalid");

      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining("Invalid type"));
    });
  });

  describe("set project type", () => {
    it("sets project type with --scope project", async () => {
      vi.mocked(findProjectRoot).mockReturnValue("/project");
      const saveRcSpy = vi.spyOn(ProjectStoreManagerClass.prototype, "saveRc");

      await runType("slim", { scope: "project" });

      expect(saveRcSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "slim" })
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("project"));
    });

    it("errors when setting project type without project", async () => {
      vi.mocked(findProjectRoot).mockReturnValue(null);

      await runType("slim", { scope: "project" });

      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining("No project found"));
    });
  });

  describe("clear project type", () => {
    it("clears project type with --clear-project", async () => {
      vi.mocked(findProjectRoot).mockReturnValue("/project");
      vi.spyOn(ProjectStoreManagerClass.prototype, "loadRc").mockReturnValue({
        activeProfileId: null,
        type: "slim",
      });
      const saveRcSpy = vi.spyOn(ProjectStoreManagerClass.prototype, "saveRc");

      await runType(undefined, { clearProject: true });

      expect(saveRcSpy).toHaveBeenCalled();
      const savedRc = saveRcSpy.mock.calls[0][0] as { activeProfileId: string | null; type?: string };
      expect(savedRc.type).toBeUndefined();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("Cleared"));
    });

    it("shows info when no project type to clear", async () => {
      vi.mocked(findProjectRoot).mockReturnValue("/project");
      vi.spyOn(ProjectStoreManagerClass.prototype, "loadRc").mockReturnValue({
        activeProfileId: null,
      });

      await runType(undefined, { clearProject: true });

      expect(mockSpinner.info).toHaveBeenCalledWith(expect.stringContaining("No project type override"));
    });

    it("errors when clearing without project", async () => {
      vi.mocked(findProjectRoot).mockReturnValue(null);

      await runType(undefined, { clearProject: true });

      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining("No project found"));
    });
  });

  describe("interactive selection", () => {
    it("uses select prompt with --select flag", async () => {
      vi.mocked(select).mockResolvedValue("slim");
      const setActiveTypeSpy = vi.spyOn(SettingsManagerClass.prototype, "setActiveType");

      await runType(undefined, { select: true });

      expect(select).toHaveBeenCalled();
      expect(setActiveTypeSpy).toHaveBeenCalledWith("slim");
    });
  });
});
