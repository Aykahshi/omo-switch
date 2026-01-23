import * as fs from "fs";
import * as path from "path";
import { ProjectRc } from "../store/types";

const OPENCODE_DIR = ".opencode";
const OMO_CONFIGS_DIR = "omo-configs";
const TARGET_CONFIG_FILE = "oh-my-opencode.jsonc";
const PROJECT_RC_FILE = ".omorc";

/**
 * Traverse UP from startDir looking for .opencode/ directory.
 * Returns null if not found.
 */
export function findProjectRoot(startDir?: string): string | null {
  let currentDir = startDir ? path.resolve(startDir) : process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const opencodeDir = path.join(currentDir, OPENCODE_DIR);
    if (fs.existsSync(opencodeDir) && fs.statSync(opencodeDir).isDirectory()) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root as well
  const rootOpencodeDir = path.join(root, OPENCODE_DIR);
  if (fs.existsSync(rootOpencodeDir) && fs.statSync(rootOpencodeDir).isDirectory()) {
    return root;
  }

  return null;
}

/**
 * Same as findProjectRoot but returns cwd if .opencode/ not found.
 */
export function resolveProjectRoot(startDir?: string): string {
  const projectRoot = findProjectRoot(startDir);
  return projectRoot ?? (startDir ? path.resolve(startDir) : process.cwd());
}

/**
 * Returns <projectRoot>/.opencode/omo-configs/
 */
export function getProjectConfigsPath(projectRoot: string): string {
  return path.join(projectRoot, OPENCODE_DIR, OMO_CONFIGS_DIR);
}

/**
 * Returns <projectRoot>/.opencode/oh-my-opencode.jsonc
 */
export function getProjectTargetPath(projectRoot: string): string {
  return path.join(projectRoot, OPENCODE_DIR, TARGET_CONFIG_FILE);
}

/**
 * Returns <projectRoot>/.opencode/.omorc
 */
export function getProjectRcPath(projectRoot: string): string {
  return path.join(projectRoot, OPENCODE_DIR, PROJECT_RC_FILE);
}

/**
 * Load .omorc if exists, returns null otherwise
 */
export function loadProjectRc(projectRoot: string): ProjectRc | null {
  const rcPath = getProjectRcPath(projectRoot);
  if (!fs.existsSync(rcPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(rcPath, "utf-8");
    return JSON.parse(content) as ProjectRc;
  } catch {
    return null;
  }
}

/**
 * Save .omorc to project root
 */
export function saveProjectRc(projectRoot: string, rc: ProjectRc): void {
  const rcPath = getProjectRcPath(projectRoot);
  const opencodeDir = path.dirname(rcPath);
  if (!fs.existsSync(opencodeDir)) {
    fs.mkdirSync(opencodeDir, { recursive: true });
  }
  fs.writeFileSync(rcPath, JSON.stringify(rc, null, 2), "utf-8");
}

/**
 * Create .opencode/ and .opencode/omo-configs/ if missing
 */
export function ensureProjectDirs(projectRoot: string): void {
  const opencodeDir = path.join(projectRoot, OPENCODE_DIR);
  const configsDir = getProjectConfigsPath(projectRoot);

  if (!fs.existsSync(opencodeDir)) {
    fs.mkdirSync(opencodeDir, { recursive: true });
  }
  if (!fs.existsSync(configsDir)) {
    fs.mkdirSync(configsDir, { recursive: true });
  }
}
