import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  Scope,
  OmosConfig,
  OmosPresetConfig,
  DEFAULT_OMOS_CONFIG,
} from "./types";
import { cleanOldBackups } from "../utils/backup-cleaner";
import {
  getOmosConfigTargetPath,
  getOmosProjectTargetPath,
  ensureOmosConfigDir,
} from "../utils/omos-config-path";

/**
 * Manages OMOS preset configurations.
 * Unlike OMO which uses multiple profile files, OMOS stores all presets
 * in a single config file with a `preset` field indicating the active preset.
 */
export class OmosConfigManager {
  private readonly scope: Scope;
  private readonly projectRoot: string | undefined;
  private readonly targetPath: string;
  private readonly backupsPath: string;

  constructor(scope: Scope, projectRoot?: string) {
    this.scope = scope;
    this.projectRoot = projectRoot;

    if (scope === "project") {
      if (!projectRoot) {
        throw new Error("projectRoot is required for project scope");
      }
      this.targetPath = getOmosProjectTargetPath(projectRoot);
      this.backupsPath = path.join(projectRoot, ".opencode", "backups");
    } else {
      this.targetPath = getOmosConfigTargetPath().path;
      // Use global omo-switch backups directory
      const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
      this.backupsPath = path.join(configHome, "omo-switch", "backups");
    }
  }

  /**
   * Get the target config file path.
   */
  getTargetPath(): string {
    return this.targetPath;
  }

  /**
   * Check if the OMOS config file exists.
   */
  configExists(): boolean {
    return fs.existsSync(this.targetPath);
  }

  /**
   * Load the OMOS config. Returns null if file doesn't exist.
   */
  loadConfig(): OmosConfig | null {
    if (!this.configExists()) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.targetPath, "utf-8");
      return JSON.parse(content) as OmosConfig;
    } catch {
      return null;
    }
  }

  /**
   * Load the OMOS config, or create a default one if it doesn't exist.
   */
  loadOrCreateConfig(): OmosConfig {
    const existing = this.loadConfig();
    if (existing) {
      return existing;
    }

    // Create default config
    const defaultConfig = { ...DEFAULT_OMOS_CONFIG };
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Save the OMOS config.
   * IMPORTANT: Always writes as .json, never .jsonc
   */
  saveConfig(config: OmosConfig): void {
    ensureOmosConfigDir(this.targetPath);
    fs.writeFileSync(this.targetPath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * List all preset names.
   */
  listPresets(): string[] {
    const config = this.loadConfig();
    if (!config?.presets) {
      return [];
    }
    return Object.keys(config.presets);
  }

  /**
   * Get the currently active preset name.
   */
  getActivePreset(): string | null {
    const config = this.loadConfig();
    return config?.preset ?? null;
  }

  /**
   * Set the active preset.
   */
  setActivePreset(presetName: string | null): void {
    const config = this.loadOrCreateConfig();
    config.preset = presetName;
    this.saveConfig(config);
  }

  /**
   * Get a specific preset configuration.
   */
  getPreset(name: string): OmosPresetConfig | null {
    const config = this.loadConfig();
    return config?.presets?.[name] ?? null;
  }

  /**
   * Add a new preset.
   * If preset with same name exists, it will be overwritten.
   */
  addPreset(name: string, presetConfig: OmosPresetConfig): void {
    const config = this.loadOrCreateConfig();

    if (!config.presets) {
      config.presets = {};
    }

    config.presets[name] = presetConfig;
    this.saveConfig(config);
  }

  /**
   * Remove a preset.
   * Returns true if preset was removed, false if it didn't exist.
   */
  removePreset(name: string): boolean {
    const config = this.loadConfig();

    if (!config?.presets?.[name]) {
      return false;
    }

    delete config.presets[name];
    this.saveConfig(config);
    return true;
  }

  /**
   * Create a backup of the current config file.
   * Returns the backup file path, or null if no config exists.
   */
  createBackup(): string | null {
    if (!this.configExists()) {
      return null;
    }

    // Ensure backups directory exists
    if (!fs.existsSync(this.backupsPath)) {
      fs.mkdirSync(this.backupsPath, { recursive: true });
    }

    // Clean up old backups before creating new one
    cleanOldBackups(this.backupsPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `${timestamp}__oh-my-opencode-slim.json`;
    const backupPath = path.join(this.backupsPath, backupFileName);

    fs.copyFileSync(this.targetPath, backupPath);
    return backupPath;
  }

  /**
   * Get the number of agents configured in a preset.
   */
  getPresetAgentCount(name: string): number {
    const preset = this.getPreset(name);
    if (!preset) {
      return 0;
    }

    const agents = ["orchestrator", "oracle", "librarian", "explorer", "designer", "fixer"] as const;
    return agents.filter((agent) => preset[agent] !== undefined).length;
  }
}
