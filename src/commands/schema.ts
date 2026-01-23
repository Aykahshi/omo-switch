import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as path from "path";
import * as fs from "fs";
import { StoreManager } from "../store";
import { downloadFile, readBundledAsset } from "../utils/downloader";

const SCHEMA_URL = "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json";

const SCHEMA_FILE_NAME = "oh-my-opencode.schema.json";

async function refreshSchema(offline: boolean): Promise<void> {
  const spinner = ora("Refreshing schema...").start();

  try {
    const store = new StoreManager();
    store.ensureDirectories();

    const schemaPath = path.join(store.getCacheSchemaPath(), SCHEMA_FILE_NAME);

    if (offline) {
      spinner.text = "Checking local cache...";

      if (fs.existsSync(schemaPath)) {
        spinner.succeed("Using cached schema");
        console.log(chalk.gray(`  Path: ${schemaPath}`));
        return;
      }

      spinner.text = "Loading bundled schema...";
      const bundledSchema = readBundledAsset(SCHEMA_FILE_NAME);
      if (!bundledSchema) {
        spinner.fail("No bundled schema available");
        process.exit(1);
      }

      store.saveCacheFile(store.getCacheSchemaPath(), SCHEMA_FILE_NAME, bundledSchema, { source: "bundled" });
      spinner.succeed("Using bundled schema");
      console.log(chalk.gray(`  Path: ${schemaPath}`));
      return;
    }

    spinner.text = "Downloading schema from GitHub...";
    await downloadFile(
      SCHEMA_URL,
      store.getCacheSchemaPath(),
      SCHEMA_FILE_NAME,
      { source: "github" }
    );

    spinner.succeed("Schema refreshed successfully");
    console.log(chalk.gray(`  Path: ${schemaPath}`));
    console.log(chalk.gray(`  URL: ${SCHEMA_URL}`));
  } catch (err) {
    spinner.fail(`Failed to refresh schema: ${err instanceof Error ? err.message : "Unknown error"}`);
    process.exit(1);
  }
}

export const schemaCommand = new Command("schema")
  .description("Schema management commands")
  .addCommand(new Command("refresh")
    .description("Refresh the schema cache")
    .option("--offline", "Use offline mode (no network download)")
    .action(async (options) => {
      await refreshSchema(options.offline as boolean);
    }));
