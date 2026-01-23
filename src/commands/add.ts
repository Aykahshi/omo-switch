import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import JSON5 from "json5";
import { select } from "@inquirer/prompts";
import { StoreManager, ProjectStoreManager, Scope, Profile } from "../store";
import { Validator } from "../utils/validator";
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

function deriveIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

interface AddOptions {
  id?: string;
  name?: string;
  activate?: boolean;
  force?: boolean;
  scope?: Scope;
}

export const addCommand = new Command("add")
  .description("Add a profile from a configuration file")
  .argument("<file>", "Path to the configuration file to import (supports JSON and JSONC)")
  .option("--id <id>", "Profile ID (defaults to derived from name)")
  .option("--name <name>", "Profile name (defaults to derived from id)")
  .option("--activate", "Activate this profile after adding it")
  .option("--force", "Overwrite existing profile with the same id")
  .option("--scope <scope>", "Target scope (user or project)")
  .action(async (file: string, options: AddOptions) => {
    const spinner = ora().start();

    try {
      const globalStore = new StoreManager();
      globalStore.ensureDirectories();
      const filePath = path.resolve(file);

      spinner.text = "Reading input file...";
      if (!fs.existsSync(filePath)) {
        spinner.fail(`File not found: ${filePath}`);
        process.exit(1);
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      let config: Record<string, unknown>;

      try {
        config = JSON5.parse(fileContent) as Record<string, unknown>;
      } catch (err) {
        spinner.fail(`Failed to parse file as JSON/JSONC: ${err instanceof Error ? err.message : "Unknown error"}`);
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

      // Determine scope: if not provided, prompt user
      let scope: Scope = options.scope as Scope;
      if (!scope) {
        spinner.stop();
        const answer = await select({
          message: "Where do you want to store this profile?",
          choices: [
            { name: "Global (user)", value: "user" },
            { name: "Project", value: "project" },
          ],
        });
        scope = answer as Scope;
        spinner.start();
      }

      if (scope !== "user" && scope !== "project") {
        spinner.fail(`Invalid scope: ${scope}. Use 'user' or 'project'.`);
        process.exit(1);
      }

      let profileId = options.id;
      let profileName = options.name;

      if (!profileName && !profileId) {
        profileId = deriveIdFromName(path.basename(filePath, path.extname(filePath)));
        profileName = profileId;
      } else if (profileName && !profileId) {
        profileId = deriveIdFromName(profileName);
      } else if (!profileName && profileId) {
        profileName = profileId;
      }

      const fileExt = path.extname(filePath).toLowerCase() as ".json" | ".jsonc";

      if (fileExt !== ".json" && fileExt !== ".jsonc") {
        spinner.fail(`Invalid file extension: ${fileExt}`);
        console.error(chalk.red("Only .json and .jsonc files are supported"));
        process.exit(1);
      }

      // profileId and profileName are guaranteed to be set at this point
      const finalProfileId = profileId as string;
      const finalProfileName = profileName as string;

      if (scope === "project") {
        // Project scope: use ProjectStoreManager
        const projectRoot = resolveProjectRoot();
        const projectStore = new ProjectStoreManager(projectRoot);
        projectStore.ensureDirectories();

        const existingConfig = projectStore.configExists(finalProfileId);

        if (existingConfig && !options.force) {
          spinner.fail(`Profile with id '${finalProfileId}' already exists in project. Use --force to overwrite.`);
          process.exit(1);
        }

        if (existingConfig && options.force) {
          projectStore.deleteProfileConfig(finalProfileId);
        }

        projectStore.saveProfileConfigRaw(finalProfileId, fileContent, fileExt);

        if (options.activate) {
          projectStore.saveRc({
            activeProfileId: finalProfileId,
          });
        }

        const action = existingConfig ? "Updated" : "Added";
        spinner.succeed(`${action} profile '${finalProfileName}' (${finalProfileId}) [project]`);
        console.log(chalk.gray(`  Config: ${projectStore.getConfigsPath()}/${finalProfileId}${fileExt}`));

        if (options.activate) {
          console.log(chalk.green(`  Profile activated`));
        }
      } else {
        // User scope: use StoreManager (existing behavior)
        const index = globalStore.loadIndex();
        const existingProfile = index.profiles.find((p) => p.id === finalProfileId);

        if (existingProfile) {
          if (!options.force) {
            spinner.fail(`Profile with id '${finalProfileId}' already exists. Use --force to overwrite.`);
            console.error(chalk.gray(`  Name: ${existingProfile.name}`));
            console.error(chalk.gray(`  Updated: ${existingProfile.updatedAt}`));
            process.exit(1);
          }
          existingProfile.name = finalProfileName;
          existingProfile.config = config;
          existingProfile.updatedAt = new Date().toISOString();
        } else {
          const profile: Profile = {
            id: finalProfileId,
            name: finalProfileName,
            config: config,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          index.profiles.push(profile);
        }

        if (options.activate) {
          index.activeProfileId = finalProfileId;
        }

        globalStore.saveIndex(index);

        if (existingProfile) {
          const existingConfigPath = globalStore.getProfileConfigPath(finalProfileId);
          if (existingConfigPath) {
            fs.unlinkSync(existingConfigPath);
          }
        }
        
        globalStore.saveProfileConfigRaw(finalProfileId, fileContent, fileExt);

        const action = existingProfile ? "Updated" : "Added";
        spinner.succeed(`${action} profile '${finalProfileName}' (${finalProfileId}) [user]`);
        console.log(chalk.gray(`  Config: ${globalStore.getConfigsPath()}/${finalProfileId}${fileExt}`));

        if (options.activate) {
          console.log(chalk.green(`  Profile activated`));
        }
      }
    } catch (err) {
      spinner.fail(`Failed to add profile: ${err instanceof Error ? err.message : "Unknown error"}`);
      process.exit(1);
    }
  });
