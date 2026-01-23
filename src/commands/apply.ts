import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import JSON5 from "json5";
import { StoreManager, ProjectStoreManager, Scope } from "../store";
import { Validator } from "../utils/validator";
import { getConfigTargetDir, ensureConfigDir } from "../utils/config-path";
import { downloadFile, readBundledAsset } from "../utils/downloader";
import { resolveProjectRoot } from "../utils/scope-resolver";

const SCHEMA_URL = "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json";

async function ensureSchemaAvailable(store: StoreManager): Promise<string> {
  const schemaPath = path.join(store.getCacheSchemaPath(), "oh-my-opencode.schema.json");

  if (fs.existsSync(schemaPath)) {
    return schemaPath;
  }

  try {
    await downloadFile(
      SCHEMA_URL,
      store.getCacheSchemaPath(),
      "oh-my-opencode.schema.json",
      { source: "github" }
    );
    return schemaPath;
  } catch {
    const bundledSchema = readBundledAsset("oh-my-opencode.schema.json");
    if (bundledSchema) {
      store.saveCacheFile(store.getCacheSchemaPath(), "oh-my-opencode.schema.json", bundledSchema, { source: "bundled" });
      return schemaPath;
    }
    throw new Error("Failed to download or find bundled schema");
  }
}

interface ApplyOptions {
  scope: Scope;
}

export const applyCommand = new Command("apply")
  .description("Apply profile configuration")
  .argument("<identifier>", "Profile ID or name")
  .option("--scope <scope>", "Target scope (user or project)", "user")
  .action(async (identifier: string, options: ApplyOptions) => {
    const spinner = ora().start();
    const scope = options.scope as Scope;

    if (scope !== "user" && scope !== "project") {
      spinner.fail(`Invalid scope: ${scope}. Use 'user' or 'project'.`);
      process.exit(1);
    }

    try {
      const globalStore = new StoreManager();
      globalStore.syncProfiles();
      const globalIndex = globalStore.loadIndex();

      let projectStore: ProjectStoreManager | null = null;
      if (scope === "project") {
        const projectRoot = resolveProjectRoot();
        projectStore = new ProjectStoreManager(projectRoot);
        projectStore.ensureDirectories();
      }

      // Find profile: first search in target scope, then fallback to other scope
      let profile = globalIndex.profiles.find(
        (p) => p.id === identifier || p.name.toLowerCase() === identifier.toLowerCase()
      );
      let configRaw: { path: string; content: string } | null = null;
      let profileSource: "user" | "project" = "user";

      if (scope === "project" && projectStore) {
        // For project scope, first check project profiles
        const projectProfiles = projectStore.listProfiles();
        const projectProfileId = projectProfiles.find(
          (id) => id === identifier || id.toLowerCase() === identifier.toLowerCase()
        );
        if (projectProfileId) {
          configRaw = projectStore.getProfileConfigRaw(projectProfileId);
          profileSource = "project";
          // Create a temporary profile object for project-only profiles
          if (!profile) {
            profile = {
              id: projectProfileId,
              name: projectProfileId,
              config: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }

      // If not found in project, try global
      if (!configRaw && profile) {
        configRaw = globalStore.getProfileConfigRaw(profile.id);
        profileSource = "user";
      }

      if (!profile) {
        spinner.fail(`Profile not found: ${identifier}`);
        process.exit(1);
      }

      spinner.text = "Loading profile configuration...";
      if (!configRaw) {
        spinner.fail("Profile config file not found");
        console.error(chalk.red(`Profile '${identifier}' exists in index but config file is missing.`));
        console.error(chalk.gray(`Source: ${profileSource}`));
        process.exit(1);
      }

      spinner.text = "Validating configuration...";
      let config: Record<string, unknown>;
      try {
        config = JSON5.parse(configRaw.content) as Record<string, unknown>;
      } catch (err) {
        spinner.fail("Failed to parse config as JSON/JSONC");
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
      }

      spinner.text = "Ensuring schema availability...";
      const schemaPath = await ensureSchemaAvailable(globalStore);

      spinner.text = "Validating configuration...";
      const validator = new Validator(schemaPath);
      const validation = validator.validate(config);
      
      if (!validation.valid) {
        spinner.fail("Configuration validation failed");
        console.error(chalk.red("Validation errors:"));
        for (const err of validation.errors) {
          console.error(chalk.red(`  - ${err}`));
        }
        process.exit(1);
      }

      // Determine target path based on scope
      let targetPath: string;
      let backupPath: string | null = null;

      if (scope === "project" && projectStore) {
        targetPath = projectStore.getTargetPath();
        ensureConfigDir(targetPath);

        spinner.text = "Creating backup...";
        backupPath = projectStore.createBackup(targetPath);
      } else {
        // User scope: always write to .jsonc file
        spinner.text = "Determining target path...";
        const targetDir = getConfigTargetDir();
        targetPath = path.join(targetDir.dir, "oh-my-opencode.jsonc");
        ensureConfigDir(targetPath);

        // Create backup of existing config (could be .json or .jsonc)
        spinner.text = "Creating backup...";
        const existingJsonc = path.join(targetDir.dir, "oh-my-opencode.jsonc");
        const existingJson = path.join(targetDir.dir, "oh-my-opencode.json");
        if (fs.existsSync(existingJsonc)) {
          backupPath = globalStore.createBackup(existingJsonc);
        } else if (fs.existsSync(existingJson)) {
          backupPath = globalStore.createBackup(existingJson);
        }
      }

      if (backupPath) {
        spinner.text = `Backup created: ${backupPath}`;
      }

      spinner.text = `Writing to ${targetPath}...`;
      const headerComment = `// Profile Name: ${profile.name}, edited by omo-switch`;
      // Issue 5 fix: Always use new content with header, don't try to preserve old content
      const targetContent = `${headerComment}\n${configRaw.content}`;
      
      fs.writeFileSync(targetPath, targetContent, "utf-8");

      // Update state based on scope
      if (scope === "project" && projectStore) {
        projectStore.saveRc({
          activeProfileId: profile.id,
        });
      } else {
        globalIndex.activeProfileId = profile.id;
        globalStore.saveIndex(globalIndex);
      }

      spinner.succeed(`Applied profile '${profile.name}' (${profile.id}) [${scope}]`);
      console.log(chalk.gray(`  Source: ${profileSource}`));
      console.log(chalk.gray(`  Target: ${targetPath}`));
      if (backupPath) {
        console.log(chalk.gray(`  Backup: ${backupPath}`));
      }
    } catch (err) {
      spinner.fail(`Failed to apply profile: ${err instanceof Error ? err.message : "Unknown error"}`);
      process.exit(1);
    }
  });
