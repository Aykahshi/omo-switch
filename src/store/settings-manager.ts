import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConfigType, GlobalSettings, DEFAULT_SETTINGS } from "./types";
import { loadProjectRc } from "../utils/scope-resolver";

/**
 * Manages global settings for omo-switch, including the active configuration type.
 * Supports per-project type override via .omorc file.
 */
export class SettingsManager {
  private readonly settingsPath: string;

  constructor() {
    const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
    const storePath = path.join(configHome, "omo-switch");
    this.settingsPath = path.join(storePath, "settings.json");
  }

  /**
   * Get the path to the settings file.
   */
  getSettingsPath(): string {
    return this.settingsPath;
  }

  /**
   * Load global settings from disk.
   * Returns default settings if file doesn't exist.
   */
  loadSettings(): GlobalSettings {
    if (!fs.existsSync(this.settingsPath)) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const content = fs.readFileSync(this.settingsPath, "utf-8");
      const parsed = JSON.parse(content) as Partial<GlobalSettings>;
      return {
        activeType: parsed.activeType ?? DEFAULT_SETTINGS.activeType,
        backupRetentionDays: parsed.backupRetentionDays ?? DEFAULT_SETTINGS.backupRetentionDays,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save global settings to disk.
   */
  saveSettings(settings: GlobalSettings): void {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  }

  /**
   * Get the effective configuration type, considering project override.
   * Resolution priority:
   * 1. Project .omorc "type" field (if projectRoot provided and type is set)
   * 2. Global settings.json "activeType"
   * 3. Default to "omo"
   */
  getEffectiveType(projectRoot?: string): ConfigType {
    // Check project-level override first
    if (projectRoot) {
      const projectRc = loadProjectRc(projectRoot);
      if (projectRc?.type) {
        return projectRc.type;
      }
    }

    // Fall back to global settings
    const settings = this.loadSettings();
    return settings.activeType ?? "omo";
  }

  /**
   * Check if the effective type is from a project override.
   */
  isProjectOverride(projectRoot?: string): boolean {
    if (!projectRoot) {
      return false;
    }
    const projectRc = loadProjectRc(projectRoot);
    return projectRc?.type !== undefined;
  }

  /**
   * Set the global active configuration type.
   */
  setActiveType(type: ConfigType): void {
    const settings = this.loadSettings();
    settings.activeType = type;
    this.saveSettings(settings);
  }
}
