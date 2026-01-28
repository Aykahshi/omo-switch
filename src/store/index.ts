import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Profile, StoreIndex, STORE_VERSION } from "./types";
import { cleanOldBackups } from "../utils/backup-cleaner";

export * from "./types";
export { ProjectStoreManager } from "./project-store";
export { OmosConfigManager } from "./omos-config";
export { SettingsManager } from "./settings-manager";

export class StoreManager {
  private readonly storePath: string;
  private readonly indexPath: string;
  private readonly configsPath: string;
  private readonly cacheSchemaPath: string;
  private readonly backupsPath: string;

  constructor() {
    // Store in ~/.config/omo-switch for better organization alongside opencode config
    const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
    this.storePath = path.join(configHome, "omo-switch");
    this.indexPath = path.join(this.storePath, "index.json");
    this.configsPath = path.join(this.storePath, "configs");
    this.cacheSchemaPath = path.join(this.storePath, "cache", "schema");
    this.backupsPath = path.join(this.storePath, "backups");
  }

  getStorePath(): string {
    return this.storePath;
  }

  getIndexPath(): string {
    return this.indexPath;
  }

  getConfigsPath(): string {
    return this.configsPath;
  }

  getCacheSchemaPath(): string {
    return this.cacheSchemaPath;
  }

  getBackupsPath(): string {
    return this.backupsPath;
  }

  ensureDirectories(): void {
    const dirs = [
      this.storePath,
      this.configsPath,
      this.cacheSchemaPath,
      this.backupsPath,
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  loadIndex(): StoreIndex {
    if (!fs.existsSync(this.indexPath)) {
      return {
        storeVersion: STORE_VERSION,
        activeProfileId: null,
        profiles: [],
      };
    }
    const content = fs.readFileSync(this.indexPath, "utf-8");
    return JSON.parse(content) as StoreIndex;
  }

  saveIndex(index: StoreIndex): void {
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), "utf-8");
  }

  getProfileConfigPath(profileId: string): string | null {
    const jsoncPath = path.join(this.configsPath, `${profileId}.jsonc`);
    const jsonPath = path.join(this.configsPath, `${profileId}.json`);
    if (fs.existsSync(jsoncPath)) {
      return jsoncPath;
    }
    if (fs.existsSync(jsonPath)) {
      return jsonPath;
    }
    return null;
  }

  getProfileConfig(profileId: string): Record<string, unknown> | null {
    const configPath = this.getProfileConfigPath(profileId);
    if (!configPath) {
      return null;
    }
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  }

  getProfileConfigRaw(profileId: string): { path: string; content: string } | null {
    const configPath = this.getProfileConfigPath(profileId);
    if (!configPath) {
      return null;
    }
    const content = fs.readFileSync(configPath, "utf-8");
    return { path: configPath, content };
  }

  saveProfileConfigRaw(profileId: string, content: string, extension: ".json" | ".jsonc"): void {
    const configPath = path.join(this.configsPath, `${profileId}${extension}`);
    fs.writeFileSync(configPath, content, "utf-8");
  }

  saveProfileConfig(profileId: string, config: Record<string, unknown>): void {
    const configPath = path.join(this.configsPath, `${profileId}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  createBackup(configPath: string): string | null {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    // Clean up old backups before creating new one
    cleanOldBackups(this.backupsPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `${timestamp}__${path.basename(configPath)}`;
    const backupPath = path.join(this.backupsPath, backupFileName);
    fs.copyFileSync(configPath, backupPath);
    return backupPath;
  }

  saveCacheFile(cacheDir: string, fileName: string, content: string, meta: Record<string, unknown> = {}): void {
    const filePath = path.join(cacheDir, fileName);
    const metaPath = path.join(cacheDir, "meta.json");
    fs.writeFileSync(filePath, content, "utf-8");
    fs.writeFileSync(metaPath, JSON.stringify({ ...meta, updatedAt: new Date().toISOString() }, null, 2), "utf-8");
  }

  configExists(profileId: string): boolean {
    return this.getProfileConfigPath(profileId) !== null;
  }

  private getConfigFiles(): string[] {
    if (!fs.existsSync(this.configsPath)) {
      return [];
    }
    const files = fs.readdirSync(this.configsPath);
    const profileIds = new Set<string>();
    for (const file of files) {
      if (file.endsWith(".jsonc")) {
        const id = file.replace(".jsonc", "");
        profileIds.add(id);
      } else if (file.endsWith(".json")) {
        const id = file.replace(".json", "");
        if (!profileIds.has(id)) {
          profileIds.add(id);
        }
      }
    }
    return Array.from(profileIds);
  }

  syncProfiles(): { added: string[]; existing: string[] } {
    const index = this.loadIndex();
    const existingProfileIds = new Set(index.profiles.map((p) => p.id));
    const configFiles = this.getConfigFiles();
    const added: string[] = [];
    const existing: string[] = [];

    for (const profileId of configFiles) {
      if (!existingProfileIds.has(profileId)) {
        const now = new Date().toISOString();
        const name = profileId.charAt(0).toUpperCase() + profileId.slice(1).replace(/-/g, " ");
        const profile: Profile = {
          id: profileId,
          name: name,
          config: {},
          createdAt: now,
          updatedAt: now,
        };
        index.profiles.push(profile);
        added.push(profileId);
      } else {
        existing.push(profileId);
      }
    }

    if (added.length > 0) {
      this.saveIndex(index);
    }

    return { added, existing };
  }

  /**
   * Delete a profile by ID.
   * Removes the profile from the index and deletes the config file.
   * Returns true if the profile was deleted, false if it didn't exist.
   */
  deleteProfile(profileId: string): boolean {
    const index = this.loadIndex();
    const profileIndex = index.profiles.findIndex((p) => p.id === profileId);

    if (profileIndex === -1) {
      return false;
    }

    // Remove from index
    index.profiles.splice(profileIndex, 1);

    // Reset active profile if needed
    if (index.activeProfileId === profileId) {
      index.activeProfileId = null;
    }

    this.saveIndex(index);

    // Delete config file
    const configPath = this.getProfileConfigPath(profileId);
    if (configPath && fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    return true;
  }
}
