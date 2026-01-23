import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Find existing config file at user config location.
 * Priority: .jsonc > .json
 * Returns null if neither exists.
 */
export function findExistingConfigPath(): { path: string; exists: boolean } | null {
  const isWindows = os.platform() === "win32";
  
  if (isWindows) {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const appData = process.env.APPDATA || path.join(userProfile, "AppData", "Roaming");
    
    // Check preferred location first
    const preferredDir = path.join(userProfile, ".config", "opencode");
    const fallbackDir = path.join(appData, "opencode");
    
    // Check jsonc then json in preferred location
    const preferredJsonc = path.join(preferredDir, "oh-my-opencode.jsonc");
    const preferredJson = path.join(preferredDir, "oh-my-opencode.json");
    
    if (fs.existsSync(preferredJsonc)) {
      return { path: preferredJsonc, exists: true };
    }
    if (fs.existsSync(preferredJson)) {
      return { path: preferredJson, exists: true };
    }
    
    // Check fallback location
    const fallbackJsonc = path.join(fallbackDir, "oh-my-opencode.jsonc");
    const fallbackJson = path.join(fallbackDir, "oh-my-opencode.json");
    
    if (fs.existsSync(fallbackJsonc)) {
      return { path: fallbackJsonc, exists: true };
    }
    if (fs.existsSync(fallbackJson)) {
      return { path: fallbackJson, exists: true };
    }
    
    return null;
  }
  
  // Unix/macOS
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  const configDir = path.join(configHome, "opencode");
  
  const jsoncPath = path.join(configDir, "oh-my-opencode.jsonc");
  const jsonPath = path.join(configDir, "oh-my-opencode.json");
  
  if (fs.existsSync(jsoncPath)) {
    return { path: jsoncPath, exists: true };
  }
  if (fs.existsSync(jsonPath)) {
    return { path: jsonPath, exists: true };
  }
  
  return null;
}

/**
 * Get the directory path for user config (for writing new files).
 * Caller decides the filename/extension.
 */
export function getConfigTargetDir(): { dir: string; isPreferred: boolean } {
  const isWindows = os.platform() === "win32";
  
  if (isWindows) {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const appData = process.env.APPDATA || path.join(userProfile, "AppData", "Roaming");
    
    const preferredDir = path.join(userProfile, ".config", "opencode");
    const fallbackDir = path.join(appData, "opencode");
    
    // Check if any config exists in either location to determine preference
    const existingConfig = findExistingConfigPath();
    if (existingConfig) {
      const dir = path.dirname(existingConfig.path);
      return { dir, isPreferred: dir === preferredDir };
    }
    
    // Default to preferred location for new files
    return { dir: preferredDir, isPreferred: true };
  }
  
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  const configDir = path.join(configHome, "opencode");
  return { dir: configDir, isPreferred: true };
}

export function getConfigTargetPath(): { path: string; isPreferred: boolean } {
  const isWindows = os.platform() === "win32";
  
  if (isWindows) {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const appData = process.env.APPDATA || path.join(userProfile, "AppData", "Roaming");
    
    const preferredPath = path.join(userProfile, ".config", "opencode", "oh-my-opencode.json");
    const fallbackPath = path.join(appData, "opencode", "oh-my-opencode.json");
    
    const preferredExists = fs.existsSync(preferredPath);
    const fallbackExists = fs.existsSync(fallbackPath);
    
    if (preferredExists || !fallbackExists) {
      return { path: preferredPath, isPreferred: true };
    }
    
    return { path: fallbackPath, isPreferred: false };
  }
  
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  const configPath = path.join(configHome, "opencode", "oh-my-opencode.json");
  return { path: configPath, isPreferred: true };
}

export function ensureConfigDir(configPath: string): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
