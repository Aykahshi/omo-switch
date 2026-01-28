import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { GlobalSettings, DEFAULT_SETTINGS, ConfigType } from "../store/types";

/**
 * Get the path to the global settings file.
 */
export function getSettingsPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "omo-switch", "settings.json");
}

/**
 * Load global settings. Returns default settings if file doesn't exist.
 */
export function loadGlobalSettings(): GlobalSettings {
  const settingsPath = getSettingsPath();

  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = fs.readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content) as Partial<GlobalSettings>;

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save global settings.
 */
export function saveGlobalSettings(settings: GlobalSettings): void {
  const settingsPath = getSettingsPath();
  const dir = path.dirname(settingsPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Get the current active config type.
 */
export function getActiveConfigType(): ConfigType {
  return loadGlobalSettings().activeType;
}

/**
 * Set the active config type.
 */
export function setActiveConfigType(type: ConfigType): void {
  const settings = loadGlobalSettings();
  settings.activeType = type;
  saveGlobalSettings(settings);
}

/**
 * Check if current mode is OMOS.
 */
export function isOmosMode(): boolean {
  return getActiveConfigType() === "slim";
}
