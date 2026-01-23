import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import JSON5 from "json5";
import { StoreManager, ProjectStoreManager } from "../store";
import { findProjectRoot, getProjectTargetPath } from "../utils/scope-resolver";
import { deepMerge, generateDiffOutput } from "../utils/merge-config";
import { findExistingConfigPath } from "../utils/config-path";

type ShowScope = "user" | "project" | "merged";

interface ShowOptions {
  scope: ShowScope;
}

export const showCommand = new Command("show")
  .description("Show profile configuration")
  .argument("[identifier]", "Profile ID or name (optional for merged view)")
  .option("--scope <scope>", "View scope (user, project, merged)", "merged")
  .action((identifier: string | undefined, options: ShowOptions) => {
    try {
      const scope = options.scope as ShowScope;

      if (scope !== "user" && scope !== "project" && scope !== "merged") {
        console.error(chalk.red(`Invalid scope: ${scope}. Use 'user', 'project', or 'merged'.`));
        process.exit(1);
      }

      const globalStore = new StoreManager();
      globalStore.syncProfiles();
      const globalIndex = globalStore.loadIndex();

      const projectRoot = findProjectRoot();
      let projectStore: ProjectStoreManager | null = null;
      if (projectRoot) {
        projectStore = new ProjectStoreManager(projectRoot);
      }

      if (scope === "user") {
        // Show global profile only
        if (!identifier) {
          // Use active global profile
          if (!globalIndex.activeProfileId) {
            console.error(chalk.red("No active global profile. Specify a profile ID or name."));
            process.exit(1);
          }
          identifier = globalIndex.activeProfileId;
        }

        const profile = globalIndex.profiles.find(
          (p) => p.id === identifier || p.name.toLowerCase() === identifier!.toLowerCase()
        );

        if (!profile) {
          console.error(chalk.red(`Profile not found: ${identifier}`));
          process.exit(1);
        }

        console.log(chalk.cyan(`Profile: ${profile.name} (${profile.id}) [user]`));
        console.log(chalk.gray(`Created: ${profile.createdAt}`));
        console.log(chalk.gray(`Updated: ${profile.updatedAt}`));
        console.log(chalk.gray("-".repeat(40)));

        const configRaw = globalStore.getProfileConfigRaw(profile.id);
        if (configRaw) {
          console.log(configRaw.content);
        } else {
          console.error(chalk.red(`Profile config file not found`));
          process.exit(1);
        }
      } else if (scope === "project") {
        // Show project profile only
        if (!projectStore) {
          console.error(chalk.red("No .opencode/ directory found in parent directories."));
          process.exit(1);
        }

        const projectRc = projectStore.loadRc();
        let profileId = identifier;

        if (!profileId) {
          // Use active project profile
          if (!projectRc?.activeProfileId) {
            console.error(chalk.red("No active project profile. Specify a profile ID."));
            process.exit(1);
          }
          profileId = projectRc.activeProfileId;
        }

        const configRaw = projectStore.getProfileConfigRaw(profileId);
        if (!configRaw) {
          console.error(chalk.red(`Project profile not found: ${profileId}`));
          process.exit(1);
        }

        console.log(chalk.cyan(`Profile: ${profileId} (${profileId}) [project]`));
        console.log(chalk.gray(`Project: ${projectRoot}`));
        console.log(chalk.gray("-".repeat(40)));
        console.log(configRaw.content);
      } else {
        // Merged view: read actual TARGET configs, not profile store configs
        let globalConfig: Record<string, unknown> | null = null;
        let projectConfig: Record<string, unknown> | null = null;
        let globalConfigPath = "";
        let projectConfigPath = "";

        // Get global TARGET config from ~/.config/opencode/oh-my-opencode.jsonc (or .json)
        const globalTargetResult = findExistingConfigPath();
        if (globalTargetResult && globalTargetResult.exists) {
          globalConfigPath = globalTargetResult.path;
          try {
            const content = fs.readFileSync(globalConfigPath, "utf-8");
            globalConfig = JSON5.parse(content) as Record<string, unknown>;
          } catch {
            // Ignore parse errors
          }
        }

        // Get project TARGET config from <project>/.opencode/oh-my-opencode.jsonc (or .json)
        if (projectRoot) {
          const projectTargetJsonc = getProjectTargetPath(projectRoot);
          const projectTargetJson = projectTargetJsonc.replace(/\.jsonc$/, ".json");
          
          if (fs.existsSync(projectTargetJsonc)) {
            projectConfigPath = projectTargetJsonc;
            try {
              const content = fs.readFileSync(projectTargetJsonc, "utf-8");
              projectConfig = JSON5.parse(content) as Record<string, unknown>;
            } catch {
              // Ignore parse errors
            }
          } else if (fs.existsSync(projectTargetJson)) {
            projectConfigPath = projectTargetJson;
            try {
              const content = fs.readFileSync(projectTargetJson, "utf-8");
              projectConfig = JSON5.parse(content) as Record<string, unknown>;
            } catch {
              // Ignore parse errors
            }
          }
        }

        if (!globalConfig && !projectConfig) {
          console.error(chalk.red("No applied config found in either scope."));
          console.error(chalk.gray("Use 'omo-switch apply <profile>' to apply a config first."));
          process.exit(1);
        }

        // Display merged view
        console.log(chalk.cyan("Merged Configuration View (Applied Configs)"));
        if (globalConfigPath) {
          console.log(chalk.gray(`Global: ${globalConfigPath}`));
        } else {
          console.log(chalk.gray(`Global: (none)`));
        }
        if (projectConfigPath) {
          console.log(chalk.gray(`Project: ${projectConfigPath}`));
        } else {
          console.log(chalk.gray(`Project: (none)`));
        }
        console.log(chalk.gray("-".repeat(50)));

        if (globalConfig && projectConfig) {
          // Both exist - show diff
          const merged = deepMerge(globalConfig, projectConfig);
          const diffOutput = generateDiffOutput(globalConfig, merged, projectConfig);
          console.log(diffOutput);
        } else if (projectConfig) {
          // Only project config
          console.log(chalk.gray("// Project config only (no global config applied)"));
          console.log(JSON.stringify(projectConfig, null, 2));
        } else if (globalConfig) {
          // Only global config
          console.log(chalk.gray("// Global config only (no project config applied)"));
          console.log(JSON.stringify(globalConfig, null, 2));
        }
      }
    } catch (err) {
      console.error(chalk.red(`Failed to show profile: ${err instanceof Error ? err.message : "Unknown error"}`));
      process.exit(1);
    }
  });
