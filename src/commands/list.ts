import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { StoreManager, ProjectStoreManager, OmosConfigManager, SettingsManager } from "../store";
import { findProjectRoot } from "../utils/scope-resolver";

type ListScope = "user" | "project" | "all";

interface ListOptions {
  scope: ListScope;
}

interface ProfileRow {
  id: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
  configExists: boolean;
  scope: "user" | "project";
}

interface OmosPresetRow {
  name: string;
  isActive: boolean;
  agentCount: number;
  scope: "user" | "project";
}

/**
 * List OMO profiles (original behavior)
 */
function listOmoProfiles(scope: ListScope): void {
  const rows: ProfileRow[] = [];

  // Collect global profiles
  if (scope === "user" || scope === "all") {
    const globalStore = new StoreManager();
    const { added } = globalStore.syncProfiles();

    if (added.length > 0) {
      console.log(chalk.gray(`Discovered ${added.length} new global profile(s): ${added.join(", ")}`));
    }

    const globalIndex = globalStore.loadIndex();

    for (const profile of globalIndex.profiles) {
      rows.push({
        id: profile.id,
        name: profile.name,
        isActive: profile.id === globalIndex.activeProfileId,
        updatedAt: profile.updatedAt,
        configExists: globalStore.configExists(profile.id),
        scope: "user",
      });
    }
  }

  // Collect project profiles
  if (scope === "project" || scope === "all") {
    const projectRoot = findProjectRoot();
    if (projectRoot) {
      const projectStore = new ProjectStoreManager(projectRoot);
      const projectProfiles = projectStore.listProfiles();
      const projectRc = projectStore.loadRc();

      for (const profileId of projectProfiles) {
        const isActive = projectRc?.activeProfileId === profileId;
        rows.push({
          id: profileId,
          name: profileId,
          isActive,
          updatedAt: "-",
          configExists: projectStore.configExists(profileId),
          scope: "project",
        });
      }
    } else if (scope === "project") {
      console.log(chalk.yellow("No .opencode/ directory found in parent directories."));
      console.log(chalk.gray("Run in a project directory or use --scope user to list global profiles."));
      return;
    }
  }

  if (rows.length === 0) {
    if (scope === "all") {
      console.log(chalk.yellow("No profiles found. Run 'omo-switch init' to get started."));
    } else if (scope === "user") {
      console.log(chalk.yellow("No global profiles found. Run 'omo-switch init' to get started."));
    } else {
      console.log(chalk.yellow("No project profiles found."));
    }
    return;
  }

  // Determine table columns based on scope
  const showScopeColumn = scope === "all";

  const headColumns = showScopeColumn
    ? [chalk.cyan("ID"), chalk.cyan("Name"), chalk.cyan("Scope"), chalk.cyan("Active"), chalk.cyan("Updated"), chalk.cyan("Config")]
    : [chalk.cyan("ID"), chalk.cyan("Name"), chalk.cyan("Active"), chalk.cyan("Updated"), chalk.cyan("Config")];

  const colWidths = showScopeColumn
    ? [20, 20, 10, 10, 25, 10]
    : [20, 20, 10, 25, 10];

  const table = new Table({
    head: headColumns,
    colWidths,
  });

  for (const row of rows) {
    const activeMarker = row.isActive ? chalk.green("*") : " ";
    const updatedDate = row.updatedAt !== "-" ? new Date(row.updatedAt).toLocaleString() : "-";
    const configMarker = row.configExists ? chalk.green("OK") : chalk.red("MISSING");
    const scopeMarker = row.scope === "project" ? chalk.blue("project") : chalk.gray("user");

    if (showScopeColumn) {
      table.push([row.id, row.name, scopeMarker, activeMarker, updatedDate, configMarker]);
    } else {
      table.push([row.id, row.name, activeMarker, updatedDate, configMarker]);
    }
  }

  console.log(table.toString());
}

/**
 * List OMOS presets
 */
function listOmosPresets(scope: ListScope): void {
  const rows: OmosPresetRow[] = [];

  // Collect user presets
  if (scope === "user" || scope === "all") {
    const omosManager = new OmosConfigManager("user");
    const presets = omosManager.listPresets();
    const active = omosManager.getActivePreset();

    for (const presetName of presets) {
      rows.push({
        name: presetName,
        isActive: presetName === active,
        agentCount: omosManager.getPresetAgentCount(presetName),
        scope: "user",
      });
    }
  }

  // Collect project presets
  if (scope === "project" || scope === "all") {
    const projectRoot = findProjectRoot();
    if (projectRoot) {
      const omosManager = new OmosConfigManager("project", projectRoot);
      const presets = omosManager.listPresets();
      const active = omosManager.getActivePreset();

      for (const presetName of presets) {
        rows.push({
          name: presetName,
          isActive: presetName === active,
          agentCount: omosManager.getPresetAgentCount(presetName),
          scope: "project",
        });
      }
    } else if (scope === "project") {
      console.log(chalk.yellow("No .opencode/ directory found in parent directories."));
      console.log(chalk.gray("Run in a project directory or use --scope user to list global presets."));
      return;
    }
  }

  if (rows.length === 0) {
    if (scope === "all") {
      console.log(chalk.yellow("No OMOS presets found. Create a config with 'omo-switch add <preset-file>'."));
    } else if (scope === "user") {
      console.log(chalk.yellow("No global OMOS presets found."));
    } else {
      console.log(chalk.yellow("No project OMOS presets found."));
    }
    return;
  }

  // Determine table columns based on scope
  const showScopeColumn = scope === "all";

  const headColumns = showScopeColumn
    ? [chalk.cyan("Preset"), chalk.cyan("Scope"), chalk.cyan("Active"), chalk.cyan("Agents")]
    : [chalk.cyan("Preset"), chalk.cyan("Active"), chalk.cyan("Agents")];

  const colWidths = showScopeColumn
    ? [25, 10, 10, 10]
    : [25, 10, 10];

  const table = new Table({
    head: headColumns,
    colWidths,
  });

  for (const row of rows) {
    const activeMarker = row.isActive ? chalk.green("*") : " ";
    const scopeMarker = row.scope === "project" ? chalk.blue("project") : chalk.gray("user");
    const agentCountStr = row.agentCount > 0 ? String(row.agentCount) : "-";

    if (showScopeColumn) {
      table.push([row.name, scopeMarker, activeMarker, agentCountStr]);
    } else {
      table.push([row.name, activeMarker, agentCountStr]);
    }
  }

  console.log(table.toString());
}

export const listCommand = new Command("list")
  .description("List all profiles or presets")
  .option("--scope <scope>", "Filter by scope (user, project, all)", "all")
  .action((options: ListOptions) => {
    try {
      const scope = options.scope as ListScope;

      if (scope !== "user" && scope !== "project" && scope !== "all") {
        console.error(chalk.red(`Invalid scope: ${scope}. Use 'user', 'project', or 'all'.`));
        process.exit(1);
      }

      // Determine active type
      const settings = new SettingsManager();
      const projectRoot = findProjectRoot();
      const activeType = settings.getEffectiveType(projectRoot ?? undefined);

      // Show type indicator
      const typeLabel = activeType === "slim" ? chalk.cyan("[SLIM]") : chalk.green("[OMO]");
      console.log(chalk.gray(`Mode: ${typeLabel}`));
      console.log();

      if (activeType === "slim") {
        listOmosPresets(scope);
      } else {
        listOmoProfiles(scope);
      }
    } catch (err) {
      console.error(chalk.red(`Failed to list: ${err instanceof Error ? err.message : "Unknown error"}`));
      process.exit(1);
    }
  });
