import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockProcessExit } from "../test-setup";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(() => []),
}));

vi.mock("ora", () => {
  const mockSpinner: any = {
    start: vi.fn(function(this: any) { this.running = true; return this; }),
    text: "",
    succeed: vi.fn(function(this: any) { this.running = false; return this; }),
    fail: vi.fn(function(this: any) { this.running = false; return this; }),
    warn: vi.fn(function(this: any) { this.running = false; return this; }),
    info: vi.fn(function(this: any) { this.running = false; return this; }),
    stop: vi.fn(function(this: any) { this.running = false; return this; }),
  };
  return {
    default: vi.fn(() => mockSpinner) as typeof import("ora").default,
  };
});

vi.mock("chalk", () => ({
  default: {
    cyan: vi.fn((s: string) => s),
    gray: vi.fn((s: string) => s),
    red: vi.fn((s: string) => s),
    green: vi.fn((s: string) => s),
  },
}));

vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn(),
}));

vi.mock("../utils/scope-resolver", async () => {
  const actual = await vi.importActual<typeof import("../utils/scope-resolver")>("../utils/scope-resolver");
  return {
    ...actual,
    resolveProjectRoot: vi.fn(() => "/project"),
    findProjectRoot: vi.fn(() => "/project"),
  };
});

const __createdStoreInstances: any[] = [];
const __createdProjectStoreInstances: any[] = [];

vi.mock("../store", () => {
  return {
    StoreManager: class {
      constructor() {
        __createdStoreInstances.push(this);
      }
      ensureDirectories() {}
      loadIndex() {
        return { profiles: [], activeProfileId: null };
      }
      saveIndex() {}
      deleteProfile() {
        return true;
      }
      getProfileConfigPath() {
        return null;
      }
      configExists() {
        return false;
      }
      getConfigsPath() {
        return "/configs";
      }
    },
    ProjectStoreManager: class {
      constructor(_projectRoot: string) {
        __createdProjectStoreInstances.push(this);
      }
      ensureDirectories() {}
      configExists() {
        return false;
      }
      deleteProfileConfig() {
        return true;
      }
      getConfigsPath() {
        return "/project/.opencode/omo-configs";
      }
      loadRc() {
        return { activeProfileId: null };
      }
      saveRc() {}
      listProfiles() {
        return [];
      }
    },
    SettingsManager: class {
      getEffectiveType() {
        return "omo";
      }
      loadSettings() {
        return { type: "omo" };
      }
      isProjectOverride() {
        return false;
      }
    },
    OmosConfigManager: class {
      constructor() {}
      getPreset() {
        return null;
      }
      removePreset() {
        return true;
      }
      getActivePreset() {
        return null;
      }
      setActivePreset() {}
    },
    __createdStoreInstances,
    __createdProjectStoreInstances,
  };
});

import * as fs from "fs";
import ora from "ora";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { findProjectRoot } from "../utils/scope-resolver";

describe("rmCommand", () => {
  let StoreManagerClass: any;
  let ProjectStoreManagerClass: any;
  let rmCommand: any;
  let mockSpinner: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockProcessExit();

    const storeModule = await import("../store");
    StoreManagerClass = storeModule.StoreManager;
    ProjectStoreManagerClass = storeModule.ProjectStoreManager;

    storeModule.__createdStoreInstances.length = 0;
    storeModule.__createdProjectStoreInstances.length = 0;

    mockSpinner = vi.mocked(ora)();

    vi.spyOn(StoreManagerClass.prototype, "loadIndex").mockReturnValue({
      profiles: [{ id: "test-profile", name: "Test Profile", config: {}, createdAt: "2024-01-01", updatedAt: "2024-01-01" }],
      activeProfileId: null,
    });
    vi.spyOn(StoreManagerClass.prototype, "deleteProfile").mockReturnValue(true);

    vi.spyOn(ProjectStoreManagerClass.prototype, "configExists").mockReturnValue(false);
    vi.spyOn(ProjectStoreManagerClass.prototype, "deleteProfileConfig").mockReturnValue(true);
    vi.spyOn(ProjectStoreManagerClass.prototype, "loadRc").mockReturnValue({ activeProfileId: null });
    vi.spyOn(ProjectStoreManagerClass.prototype, "saveRc").mockImplementation(() => {});

    vi.mocked(findProjectRoot).mockReturnValue("/project");
    vi.mocked(confirm).mockResolvedValue(true);

    mockSpinner.start.mockClear();
    mockSpinner.succeed.mockClear();
    mockSpinner.fail.mockClear();
    mockSpinner.stop.mockClear();

    const mod = await import("./rm");
    rmCommand = mod.rmCommand;
  });

  async function runRm(
    profileId: string,
    opts: { scope?: string; force?: boolean } = {}
  ) {
    const cmd = rmCommand as any;
    cmd._optionValues = {};
    cmd._optionValueSources = {};

    if (opts.scope) {
      cmd._optionValues.scope = opts.scope;
      cmd._optionValueSources.scope = "cli";
    }
    if (opts.force) {
      cmd._optionValues.force = true;
      cmd._optionValueSources.force = "cli";
    }

    cmd.processedArgs = [profileId];

    try {
      await cmd._actionHandler(cmd.processedArgs);
    } catch (err: any) {
      if (err.message?.includes?.("process.exit")) {
        return;
      }
      throw err;
    }
  }

  async function lastStoreInstance() {
    const m = await import("../store");
    return m.__createdStoreInstances[m.__createdStoreInstances.length - 1];
  }

  async function lastProjectStoreInstance() {
    const m = await import("../store");
    return m.__createdProjectStoreInstances[m.__createdProjectStoreInstances.length - 1];
  }

  it("removes profile from user scope with --force", async () => {
    vi.spyOn(StoreManagerClass.prototype, "loadIndex").mockReturnValue({
      profiles: [{ id: "test-profile", name: "Test Profile", config: {}, createdAt: "2024-01-01", updatedAt: "2024-01-01" }],
      activeProfileId: null,
    });

    await runRm("test-profile", { scope: "user", force: true });

    const inst = await lastStoreInstance();
    expect(inst.deleteProfile).toHaveBeenCalledWith("test-profile");
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it("removes profile from project scope with --force", async () => {
    vi.spyOn(ProjectStoreManagerClass.prototype, "configExists").mockReturnValue(true);

    await runRm("project-profile", { scope: "project", force: true });

    const inst = await lastProjectStoreInstance();
    expect(inst.deleteProfileConfig).toHaveBeenCalledWith("project-profile");
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it("fails when profile does not exist in user scope", async () => {
    vi.spyOn(StoreManagerClass.prototype, "loadIndex").mockReturnValue({
      profiles: [],
      activeProfileId: null,
    });

    await runRm("nonexistent", { scope: "user", force: true });

    expect(mockSpinner.fail).toHaveBeenCalled();
  });

  it("fails when profile does not exist in project scope", async () => {
    vi.spyOn(ProjectStoreManagerClass.prototype, "configExists").mockReturnValue(false);

    await runRm("nonexistent", { scope: "project", force: true });

    expect(mockSpinner.fail).toHaveBeenCalled();
  });

  it("prompts for confirmation without --force", async () => {
    vi.spyOn(StoreManagerClass.prototype, "loadIndex").mockReturnValue({
      profiles: [{ id: "test-profile", name: "Test Profile", config: {}, createdAt: "2024-01-01", updatedAt: "2024-01-01" }],
      activeProfileId: null,
    });
    vi.mocked(confirm).mockResolvedValue(true);

    await runRm("test-profile", { scope: "user" });

    expect(confirm).toHaveBeenCalled();
  });

  it("cancels deletion when user declines confirmation", async () => {
    vi.spyOn(StoreManagerClass.prototype, "loadIndex").mockReturnValue({
      profiles: [{ id: "test-profile", name: "Test Profile", config: {}, createdAt: "2024-01-01", updatedAt: "2024-01-01" }],
      activeProfileId: null,
    });
    vi.mocked(confirm).mockResolvedValue(false);

    await runRm("test-profile", { scope: "user" });

    expect(chalk.gray).toHaveBeenCalledWith("Operation cancelled.");
    const inst = await lastStoreInstance();
    expect(inst.deleteProfile).not.toHaveBeenCalled();
  });

  it("resets activeProfileId when deleting active project profile", async () => {
    vi.spyOn(ProjectStoreManagerClass.prototype, "configExists").mockReturnValue(true);
    vi.spyOn(ProjectStoreManagerClass.prototype, "loadRc").mockReturnValue({ activeProfileId: "active-profile" });

    await runRm("active-profile", { scope: "project", force: true });

    const inst = await lastProjectStoreInstance();
    expect(inst.saveRc).toHaveBeenCalledWith({ activeProfileId: null });
  });

  it("fails with invalid scope", async () => {
    await runRm("test-profile", { scope: "invalid" });

    expect(mockSpinner.fail).toHaveBeenCalled();
  });

  it("searches both scopes when no scope specified - finds in project", async () => {
    vi.spyOn(ProjectStoreManagerClass.prototype, "configExists").mockReturnValue(true);
    vi.mocked(confirm).mockResolvedValue(true);

    await runRm("found-in-project", {});

    const inst = await lastProjectStoreInstance();
    expect(inst.deleteProfileConfig).toHaveBeenCalledWith("found-in-project");
  });

  it("searches both scopes when no scope specified - finds in user", async () => {
    vi.spyOn(ProjectStoreManagerClass.prototype, "configExists").mockReturnValue(false);
    vi.spyOn(StoreManagerClass.prototype, "loadIndex").mockReturnValue({
      profiles: [{ id: "found-in-user", name: "Found In User", config: {}, createdAt: "2024-01-01", updatedAt: "2024-01-01" }],
      activeProfileId: null,
    });
    vi.mocked(confirm).mockResolvedValue(true);

    await runRm("found-in-user", {});

    const inst = await lastStoreInstance();
    expect(inst.deleteProfile).toHaveBeenCalledWith("found-in-user");
  });
});
