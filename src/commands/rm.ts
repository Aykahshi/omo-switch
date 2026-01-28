import { Command } from "commander";
import chalk from "chalk";
import ora, { Ora } from "ora";
import { confirm } from "@inquirer/prompts";
import { StoreManager, ProjectStoreManager, Scope, SettingsManager, OmosConfigManager } from "../store";
import { findProjectRoot } from "../utils/scope-resolver";

interface RmOptions {
  scope?: Scope;
  force?: boolean;
}

/**
 * Handle OMOS preset removal.
 * Removes a preset from the OMOS config file.
 */
async function handleOmosRm(
  presetName: string,
  options: RmOptions,
  spinner: Ora,
  projectRoot: string | null
): Promise<void> {
  const scope = options.scope as Scope | undefined;

  if (scope && scope !== "user" && scope !== "project") {
    spinner.fail(`Invalid scope: ${scope}. Use 'user' or 'project'.`);
    process.exit(1);
  }

  let found = false;
  let deletedFrom: "user" | "project" | null = null;

  // If scope is specified, only check that scope
  if (scope === "user") {
    spinner.text = "Checking global OMOS config...";
    const omosManager = new OmosConfigManager("user");

    if (!omosManager.getPreset(presetName)) {
      spinner.fail(`Preset '${presetName}' not found in global OMOS config.`);
      process.exit(1);
    }

    if (!options.force) {
      spinner.stop();
      const confirmed = await confirm({
        message: `Are you sure you want to delete preset '${presetName}'?`,
        default: false,
      });

      if (!confirmed) {
        console.log(chalk.gray("Operation cancelled."));
        return;
      }
      spinner.start();
    }

    spinner.text = "Deleting preset...";
    omosManager.removePreset(presetName);

    // Clear active preset if it was the deleted one
    if (omosManager.getActivePreset() === presetName) {
      omosManager.setActivePreset(null);
    }

    found = true;
    deletedFrom = "user";
  } else if (scope === "project") {
    spinner.text = "Checking project OMOS config...";

    if (!projectRoot) {
      spinner.fail("No .opencode/ directory found in parent directories.");
      console.log(chalk.gray("Run in a project directory or use --scope user."));
      process.exit(1);
    }

    const omosManager = new OmosConfigManager("project", projectRoot);

    if (!omosManager.getPreset(presetName)) {
      spinner.fail(`Preset '${presetName}' not found in project OMOS config.`);
      process.exit(1);
    }

    if (!options.force) {
      spinner.stop();
      const confirmed = await confirm({
        message: `Are you sure you want to delete preset '${presetName}'?`,
        default: false,
      });

      if (!confirmed) {
        console.log(chalk.gray("Operation cancelled."));
        return;
      }
      spinner.start();
    }

    spinner.text = "Deleting preset...";
    omosManager.removePreset(presetName);

    // Clear active preset if it was the deleted one
    if (omosManager.getActivePreset() === presetName) {
      omosManager.setActivePreset(null);
    }

    found = true;
    deletedFrom = "project";
  } else {
    // No scope specified: try to find in both scopes
    spinner.text = "Searching for preset...";

    // Check project first
    if (projectRoot) {
      const omosManager = new OmosConfigManager("project", projectRoot);
      if (omosManager.getPreset(presetName)) {
        if (!options.force) {
          spinner.stop();
          const confirmed = await confirm({
            message: `Delete preset '${presetName}' from project OMOS config?`,
            default: false,
          });

          if (!confirmed) {
            console.log(chalk.gray("Operation cancelled."));
            return;
          }
          spinner.start();
        }

        spinner.text = "Deleting preset from project...";
        omosManager.removePreset(presetName);

        if (omosManager.getActivePreset() === presetName) {
          omosManager.setActivePreset(null);
        }

        found = true;
        deletedFrom = "project";
      }
    }

    // Check global if not found in project
    if (!found) {
      const omosManager = new OmosConfigManager("user");
      if (omosManager.getPreset(presetName)) {
        if (!options.force) {
          spinner.stop();
          const confirmed = await confirm({
            message: `Delete preset '${presetName}' from global OMOS config?`,
            default: false,
          });

          if (!confirmed) {
            console.log(chalk.gray("Operation cancelled."));
            return;
          }
          spinner.start();
        }

        spinner.text = "Deleting preset from global config...";
        omosManager.removePreset(presetName);

        if (omosManager.getActivePreset() === presetName) {
          omosManager.setActivePreset(null);
        }

        found = true;
        deletedFrom = "user";
      }
    }
  }

  if (!found) {
    spinner.fail(`Preset '${presetName}' not found.`);
    process.exit(1);
  }

  const scopeLabel = deletedFrom === "project" ? "[project]" : "[user]";
  spinner.succeed(`Deleted OMOS preset '${presetName}' ${scopeLabel}`);
}

/**
 * Handle OMO profile removal.
 * Original OMO removal logic.
 */
async function handleOmoRm(
  profileId: string,
  options: RmOptions,
  spinner: Ora,
  projectRoot: string | null
): Promise<void> {
  const scope = options.scope as Scope | undefined;

  if (scope && scope !== "user" && scope !== "project") {
    spinner.fail(`Invalid scope: ${scope}. Use 'user' or 'project'.`);
    process.exit(1);
  }

  let found = false;
  let deletedFrom: "user" | "project" | null = null;

  // If scope is specified, only check that scope
  if (scope === "user") {
    spinner.text = "Checking global store...";
    const globalStore = new StoreManager();
    const index = globalStore.loadIndex();
    const profile = index.profiles.find((p) => p.id === profileId);

    if (!profile) {
      spinner.fail(`Profile '${profileId}' not found in global store.`);
      process.exit(1);
    }

    if (!options.force) {
      spinner.stop();
      const confirmed = await confirm({
        message: `Are you sure you want to delete profile '${profileId}'?`,
        default: false,
      });

      if (!confirmed) {
        console.log(chalk.gray("Operation cancelled."));
        return;
      }
      spinner.start();
    }

    spinner.text = "Deleting profile...";
    globalStore.deleteProfile(profileId);
    found = true;
    deletedFrom = "user";
  } else if (scope === "project") {
    spinner.text = "Checking project store...";

    if (!projectRoot) {
      spinner.fail("No .opencode/ directory found in parent directories.");
      console.log(chalk.gray("Run in a project directory or use --scope user."));
      process.exit(1);
    }

    const projectStore = new ProjectStoreManager(projectRoot);

    if (!projectStore.configExists(profileId)) {
      spinner.fail(`Profile '${profileId}' not found in project.`);
      process.exit(1);
    }

    if (!options.force) {
      spinner.stop();
      const confirmed = await confirm({
        message: `Are you sure you want to delete profile '${profileId}'?`,
        default: false,
      });

      if (!confirmed) {
        console.log(chalk.gray("Operation cancelled."));
        return;
      }
      spinner.start();
    }

    spinner.text = "Deleting profile...";
    projectStore.deleteProfileConfig(profileId);

    // Reset active profile if needed
    const rc = projectStore.loadRc();
    if (rc && rc.activeProfileId === profileId) {
      projectStore.saveRc({ activeProfileId: null });
    }

    found = true;
    deletedFrom = "project";
  } else {
    // No scope specified: try to find in both stores
    spinner.text = "Searching for profile...";

    // Check project first
    if (projectRoot) {
      const projectStore = new ProjectStoreManager(projectRoot);
      if (projectStore.configExists(profileId)) {
        if (!options.force) {
          spinner.stop();
          const confirmed = await confirm({
            message: `Delete profile '${profileId}' from project?`,
            default: false,
          });

          if (!confirmed) {
            console.log(chalk.gray("Operation cancelled."));
            return;
          }
          spinner.start();
        }

        spinner.text = "Deleting profile from project...";
        projectStore.deleteProfileConfig(profileId);

        const rc = projectStore.loadRc();
        if (rc && rc.activeProfileId === profileId) {
          projectStore.saveRc({ activeProfileId: null });
        }

        found = true;
        deletedFrom = "project";
      }
    }

    // Check global store if not found in project
    if (!found) {
      const globalStore = new StoreManager();
      const index = globalStore.loadIndex();
      const profile = index.profiles.find((p) => p.id === profileId);

      if (profile) {
        if (!options.force) {
          spinner.stop();
          const confirmed = await confirm({
            message: `Delete profile '${profileId}' from global store?`,
            default: false,
          });

          if (!confirmed) {
            console.log(chalk.gray("Operation cancelled."));
            return;
          }
          spinner.start();
        }

        spinner.text = "Deleting profile from global store...";
        globalStore.deleteProfile(profileId);
        found = true;
        deletedFrom = "user";
      }
    }
  }

  if (!found) {
    spinner.fail(`Profile '${profileId}' not found.`);
    process.exit(1);
  }

  const scopeLabel = deletedFrom === "project" ? "[project]" : "[user]";
  spinner.succeed(`Deleted profile '${profileId}' ${scopeLabel}`);
}

export const rmCommand = new Command("rm")
  .description("Remove a profile or preset by ID")
  .argument("<identifier>", "Profile ID (OMO) or preset name (OMOS) to remove")
  .option("--scope <scope>", "Target scope (user or project)")
  .option("--force", "Skip confirmation prompt")
  .action(async (identifier: string, options: RmOptions) => {
    const spinner = ora().start();

    try {
      const projectRoot = findProjectRoot();
      const settings = new SettingsManager();
      const activeType = settings.getEffectiveType(projectRoot ?? undefined);

      if (activeType === "slim") {
        await handleOmosRm(identifier, options, spinner, projectRoot);
      } else {
        await handleOmoRm(identifier, options, spinner, projectRoot);
      }
    } catch (err) {
      spinner.fail(`Failed to remove: ${err instanceof Error ? err.message : "Unknown error"}`);
      process.exit(1);
    }
  });
