import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { select } from "@inquirer/prompts";
import { SettingsManager, ConfigType, ProjectStoreManager } from "../store";
import { findProjectRoot, loadProjectRc, saveProjectRc } from "../utils/scope-resolver";

interface TypeOptions {
  scope?: "user" | "project";
  select?: boolean;
  clearProject?: boolean;
}

export const typeCommand = new Command("type")
  .description("Get or set the active configuration type (omo or slim)")
  .argument("[type]", "Type to set (omo or slim)")
  .option("--scope <scope>", "Set for user (global) or project scope", "user")
  .option("--select", "Interactively select type")
  .option("--clear-project", "Remove project-level type override")
  .action(async (type?: string, options?: TypeOptions) => {
    const spinner = ora().start();

    try {
      const settings = new SettingsManager();
      const projectRoot = findProjectRoot();

      // Handle --clear-project flag
      if (options?.clearProject) {
        if (!projectRoot) {
          spinner.fail("No project found. Not in a project directory.");
          process.exit(1);
        }

        const projectStore = new ProjectStoreManager(projectRoot);
        const rc = projectStore.loadRc() || { activeProfileId: null };
        
        if (rc.type === undefined) {
          spinner.info("No project type override to clear.");
          return;
        }

        delete rc.type;
        projectStore.saveRc(rc);
        spinner.succeed("Cleared project type override. Now using global setting.");
        return;
      }

      // Handle --select flag (interactive)
      if (options?.select) {
        spinner.stop();
        const selectedType = await select({
          message: "Select configuration type:",
          choices: [
            { name: "omo (oh-my-opencode)", value: "omo" },
            { name: "slim (oh-my-opencode-slim)", value: "slim" },
          ],
        });
        type = selectedType;
        spinner.start();
      }

      // If no type argument, show current type
      if (!type) {
        const effectiveType = settings.getEffectiveType(projectRoot ?? undefined);
        const isOverride = settings.isProjectOverride(projectRoot ?? undefined);
        
        const typeLabel = effectiveType === "slim" 
          ? chalk.cyan("slim") + chalk.gray(" (oh-my-opencode-slim)")
          : chalk.green("omo") + chalk.gray(" (oh-my-opencode)");
        
        const overrideIndicator = isOverride 
          ? chalk.yellow(" (project override)") 
          : "";
        
        spinner.stop();
        console.log(`Current type: ${typeLabel}${overrideIndicator}`);
        
        // Show additional info
        const globalSettings = settings.loadSettings();
        console.log(chalk.gray(`  Global default: ${globalSettings.activeType}`));
        
        if (projectRoot) {
          const projectRc = loadProjectRc(projectRoot);
          const projectType = projectRc?.type;
          console.log(chalk.gray(`  Project override: ${projectType ?? "(none)"}`));
        }
        return;
      }

      // Validate type
      if (type !== "omo" && type !== "slim") {
        spinner.fail(`Invalid type: ${type}. Use 'omo' or 'slim'.`);
        process.exit(1);
      }

      const configType = type as ConfigType;
      const scope = options?.scope || "user";

      if (scope === "project") {
        // Set project-level type
        if (!projectRoot) {
          spinner.fail("No project found. Not in a project directory.");
          console.log(chalk.gray("Use --scope user to set global type."));
          process.exit(1);
        }

        const projectStore = new ProjectStoreManager(projectRoot);
        projectStore.ensureDirectories();
        const rc = projectStore.loadRc() || { activeProfileId: null };
        rc.type = configType;
        projectStore.saveRc(rc);

        spinner.succeed(`Set project type to '${configType}'`);
        console.log(chalk.gray(`  Project: ${projectRoot}`));
      } else {
        // Set global type
        settings.setActiveType(configType);
        spinner.succeed(`Set global type to '${configType}'`);
      }
    } catch (err) {
      spinner.fail(`Failed to set type: ${err instanceof Error ? err.message : "Unknown error"}`);
      process.exit(1);
    }
  });
