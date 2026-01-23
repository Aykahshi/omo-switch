import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockProcessExit } from "../test-setup";

vi.mock("../store", async () => {
  const actual = await vi.importActual<typeof import("../store")>("../store");
  return {
    ...actual,
  };
});

vi.mock("../utils/scope-resolver", async () => {
  const actual = await vi.importActual<typeof import("../utils/scope-resolver")>("../utils/scope-resolver");
  return {
    ...actual,
    findProjectRoot: vi.fn(() => null),
    resolveProjectRoot: vi.fn(() => null),
  };
});

vi.mock("chalk", () => ({
  default: {
    cyan: vi.fn((s: string) => s),
    gray: vi.fn((s: string) => s),
    red: vi.fn((s: string) => s),
    green: vi.fn((s: string) => s),
    yellow: vi.fn((s: string) => s),
    blue: vi.fn((s: string) => s),
  },
}));

vi.mock("cli-table3", () => {
  const TableMock = vi.fn(function(this: any) {
    this.rows = [];
    this.push = vi.fn(function(this: any, row: string[]) { this.rows.push(row); });
    this.toString = vi.fn(function(this: any) {
      return this.rows.map((r: string[]) => r.join(" | ")).join("\n");
    });
  });
  return { default: TableMock };
});

import chalk from "chalk";
import Table from "cli-table3";
import { StoreManager, ProjectStoreManager } from "../store";
import { findProjectRoot } from "../utils/scope-resolver";

describe("listCommand", () => {
  let store: StoreManager;
  let projectStore: ProjectStoreManager;
  let listCommand: any;

  function runList(opts: { scope?: string } = {}) {
    const cmd = listCommand as any;
    cmd._optionValues = { scope: opts.scope || "all" };
    cmd._optionValueSources = { scope: "cli" };
    cmd.processedArgs = [];
    cmd._actionHandler(cmd.processedArgs);
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    store = new StoreManager();
    projectStore = new ProjectStoreManager("/project");
    mockProcessExit();

    const mod = await import("./list");
    listCommand = mod.listCommand;

    vi.spyOn(StoreManager.prototype, "syncProfiles").mockReturnValue({ added: [], existing: [] });
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [],
      activeProfileId: null,
    });
    vi.spyOn(StoreManager.prototype, "configExists").mockReturnValue(true);

    vi.spyOn(ProjectStoreManager.prototype, "listProfiles").mockReturnValue([]);
    vi.spyOn(ProjectStoreManager.prototype, "loadRc").mockReturnValue({ activeProfileId: null });
    vi.spyOn(ProjectStoreManager.prototype, "configExists").mockReturnValue(true);
  });

  it("lists all profiles with active marker", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "default", name: "Default", updatedAt: "2024-01-01T00:00:00.000Z" },
        { id: "dev", name: "Development", updatedAt: "2024-01-02T00:00:00.000Z" },
      ],
      activeProfileId: "default",
    });

    runList({ scope: "all" });

    expect(Table).toHaveBeenCalledWith(expect.objectContaining({
      head: expect.arrayContaining(["ID", "Name", "Active", "Updated", "Config"]),
    }));
  });

  it("filters by user scope", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "default", name: "Default", updatedAt: "2024-01-01T00:00:00.000Z" },
      ],
      activeProfileId: null,
    });

    runList({ scope: "user" });

    expect(Table).toHaveBeenCalled();
    expect(findProjectRoot).not.toHaveBeenCalled();
  });

  it("lists project profiles when .opencode directory exists", () => {
    vi.mocked(findProjectRoot).mockReturnValue("/project");
    vi.spyOn(ProjectStoreManager.prototype, "listProfiles").mockReturnValue(["project-profile"]);

    runList({ scope: "project" });

    expect(Table).toHaveBeenCalled();
  });

  it("displays warning when --scope project but no .opencode directory found", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);

    runList({ scope: "project" });

    expect(Table).not.toHaveBeenCalled();
  });

  it("shows no profiles message when store is empty", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [],
      activeProfileId: null,
    });

    runList({ scope: "user" });

    expect(Table).not.toHaveBeenCalled();
  });

  it("shows active marker for global profiles", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "active", name: "Active", updatedAt: "2024-01-01T00:00:00.000Z" },
        { id: "inactive", name: "Inactive", updatedAt: "2024-01-02T00:00:00.000Z" },
      ],
      activeProfileId: "active",
    });

    runList({ scope: "user" });

    expect(Table).toHaveBeenCalled();
  });

  it("shows discovered new global profiles", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);
    vi.spyOn(StoreManager.prototype, "syncProfiles").mockReturnValue({
      added: ["new-profile"],
      existing: ["existing-profile"],
    });
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "existing-profile", name: "Existing", updatedAt: "2024-01-01T00:00:00.000Z" },
        { id: "new-profile", name: "New", updatedAt: "2024-01-02T00:00:00.000Z" },
      ],
      activeProfileId: null,
    });

    runList({ scope: "user" });

    expect(Table).toHaveBeenCalled();
  });

  it("includes scope column when --scope all", () => {
    vi.mocked(findProjectRoot).mockReturnValue("/project");
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "global", name: "Global", updatedAt: "2024-01-01T00:00:00.000Z" },
      ],
      activeProfileId: null,
    });
    vi.spyOn(ProjectStoreManager.prototype, "listProfiles").mockReturnValue(["local"]);

    runList({ scope: "all" });

    expect(Table).toHaveBeenCalledWith(expect.objectContaining({
      head: expect.arrayContaining(["Scope"]),
    }));
  });

  it("excludes scope column when --scope user", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "global", name: "Global", updatedAt: "2024-01-01T00:00:00.000Z" },
      ],
      activeProfileId: null,
    });

    runList({ scope: "user" });

    expect(Table).not.toHaveBeenCalledWith(expect.objectContaining({
      head: expect.arrayContaining(["Scope"]),
    }));
  });

  it("displays config status marker (OK/MISSING)", () => {
    vi.mocked(findProjectRoot).mockReturnValue(null);
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "with-config", name: "With Config", updatedAt: "2024-01-01T00:00:00.000Z" },
        { id: "without-config", name: "Without Config", updatedAt: "2024-01-02T00:00:00.000Z" },
      ],
      activeProfileId: null,
    });
    vi.spyOn(StoreManager.prototype, "configExists").mockImplementation((id: string) => id === "with-config");

    runList({ scope: "user" });

    expect(Table).toHaveBeenCalled();
  });
});
