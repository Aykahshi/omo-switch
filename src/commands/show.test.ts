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

vi.mock("fs");
vi.mock("json5");

import chalk from "chalk";
import { StoreManager } from "../store";
import { findProjectRoot } from "../utils/scope-resolver";

describe("showCommand", () => {
  let store: StoreManager;
  let showCommand: any;

  function runShow(identifier?: string, opts: { scope?: string } = {}) {
    const cmd = showCommand as any;
    cmd._optionValues = { scope: opts.scope || "merged" };
    cmd._optionValueSources = { scope: "cli" };
    cmd.processedArgs = identifier ? [identifier] : [];
    cmd._actionHandler(cmd.processedArgs);
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    store = new StoreManager();
    mockProcessExit();

    const mod = await import("./show");
    showCommand = mod.showCommand;

    vi.spyOn(StoreManager.prototype, "syncProfiles").mockReturnValue({ added: [], existing: [] });
    vi.mocked(findProjectRoot).mockReturnValue(null);
  });

  it("shows global profile by ID", () => {
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "default", name: "Default", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
      ],
      activeProfileId: "default",
    });
    vi.spyOn(StoreManager.prototype, "getProfileConfigRaw").mockReturnValue({
      path: "/configs/default.json",
      content: '{ "agents": { "build": { "model": "test" } } }',
    });

    runShow("default", { scope: "user" });

    expect(StoreManager.prototype.getProfileConfigRaw).toHaveBeenCalledWith("default");
    expect(chalk.cyan).toHaveBeenCalledWith(expect.stringContaining("default"));
  });

  it("shows global profile by name", () => {
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "prod", name: "Production", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
      ],
      activeProfileId: null,
    });
    vi.spyOn(StoreManager.prototype, "getProfileConfigRaw").mockReturnValue({
      path: "/configs/prod.json",
      content: '{ "model": "production" }',
    });

    runShow("production", { scope: "user" });

    expect(StoreManager.prototype.getProfileConfigRaw).toHaveBeenCalledWith("prod");
  });

  it("shows active global profile when no identifier provided", () => {
    vi.spyOn(StoreManager.prototype, "loadIndex").mockReturnValue({
      profiles: [
        { id: "active", name: "Active", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
      ],
      activeProfileId: "active",
    });
    vi.spyOn(StoreManager.prototype, "getProfileConfigRaw").mockReturnValue({
      path: "/configs/active.json",
      content: '{ "active": true } }',
    });

    runShow(undefined, { scope: "user" });

    expect(StoreManager.prototype.getProfileConfigRaw).toHaveBeenCalledWith("active");
  });
});
