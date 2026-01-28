import * as os from "os";
import * as path from "path";
import * as fs from "fs";

const OMOS_CONFIG_FILENAME = "oh-my-opencode-slim.json";

/**
 * Get the directory path for OMOS user config.
 * Returns the opencode config directory.
 */
export function getOmosConfigDir(): string {
  const isWindows = os.platform() === "win32";

  if (isWindows) {
    const userProfile = process.env.USERPROFILE || os.homedir();
    return path.join(userProfile, ".config", "opencode");
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "opencode");
}

/**
 * Get the target path for OMOS user config.
 * OMOS uses .json ONLY - never .jsonc!
 */
export function getOmosConfigTargetPath(): { path: string; isPreferred: boolean } {
  const configDir = getOmosConfigDir();
  return {
    path: path.join(configDir, OMOS_CONFIG_FILENAME),
    isPreferred: true,
  };
}

/**
 * Get the target path for OMOS project config.
 * Returns: <project>/.opencode/oh-my-opencode-slim.json
 */
export function getOmosProjectTargetPath(projectRoot: string): string {
  return path.join(projectRoot, ".opencode", OMOS_CONFIG_FILENAME);
}

/**
 * Find existing OMOS config file at user config location.
 * OMOS only supports .json (NO .jsonc)
 * Returns null if doesn't exist.
 */
export function findExistingOmosConfigPath(): { path: string; exists: boolean } | null {
  const targetPath = getOmosConfigTargetPath().path;

  if (fs.existsSync(targetPath)) {
    return { path: targetPath, exists: true };
  }

  return null;
}

/**
 * Check if OMOS config exists at the given scope.
 */
export function omosConfigExists(scope: "user" | "project", projectRoot?: string): boolean {
  if (scope === "user") {
    return findExistingOmosConfigPath() !== null;
  }

  if (scope === "project" && projectRoot) {
    const projectPath = getOmosProjectTargetPath(projectRoot);
    return fs.existsSync(projectPath);
  }

  return false;
}

/**
 * Ensure the OMOS config directory exists.
 */
export function ensureOmosConfigDir(configPath: string): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
