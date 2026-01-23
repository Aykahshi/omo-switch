import chalk from "chalk";

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

/**
 * Deep merge base and override objects. Override values win on conflict.
 */
export function deepMerge(base: object, override: object): object {
  const result: JsonObject = {};
  const baseObj = base as JsonObject;
  const overrideObj = override as JsonObject;

  // Start with all keys from base
  for (const key of Object.keys(baseObj)) {
    const baseVal = baseObj[key];
    const overrideVal = overrideObj[key];

    if (overrideVal === undefined) {
      // Key only in base
      result[key] = deepClone(baseVal);
    } else if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
      // Both are objects, recurse
      result[key] = deepMerge(baseVal, overrideVal) as JsonValue;
    } else {
      // Override wins
      result[key] = deepClone(overrideVal);
    }
  }

  // Add keys only in override
  for (const key of Object.keys(overrideObj)) {
    if (!(key in baseObj)) {
      result[key] = deepClone(overrideObj[key]);
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepClone(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  const result: JsonObject = {};
  for (const key of Object.keys(value)) {
    result[key] = deepClone(value[key]);
  }
  return result;
}

interface DiffLine {
  type: "unchanged" | "added" | "removed" | "modified";
  key: string;
  path: string;
  globalValue?: JsonValue;
  projectValue?: JsonValue;
  mergedValue?: JsonValue;
}

/**
 * Generate git-diff style output showing which keys came from project scope.
 */
export function generateDiffOutput(
  global: object,
  merged: object,
  projectOverrides: object
): string {
  const lines: string[] = [];
  const globalObj = global as JsonObject;
  const mergedObj = merged as JsonObject;
  const projectObj = projectOverrides as JsonObject;

  lines.push(chalk.gray("// Merged configuration (project overrides global)"));
  lines.push(chalk.gray("// " + "-".repeat(50)));
  lines.push("{");

  const diffLines = collectDiffLines(globalObj, mergedObj, projectObj, "");
  const formattedLines = formatDiffLines(diffLines, 1);
  lines.push(...formattedLines);

  lines.push("}");
  return lines.join("\n");
}

function collectDiffLines(
  global: JsonObject,
  merged: JsonObject,
  project: JsonObject,
  pathPrefix: string
): DiffLine[] {
  const result: DiffLine[] = [];
  const allKeys = new Set([
    ...Object.keys(global),
    ...Object.keys(merged),
    ...Object.keys(project),
  ]);

  for (const key of Array.from(allKeys).sort()) {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const globalVal = global[key];
    const mergedVal = merged[key];
    const projectVal = project[key];

    const inGlobal = key in global;
    const inProject = key in project;

    if (isPlainObject(globalVal) && isPlainObject(mergedVal)) {
      // Nested object - recurse
      const nestedProject = isPlainObject(projectVal) ? projectVal : {};
      const nestedDiff = collectDiffLines(
        globalVal,
        mergedVal as JsonObject,
        nestedProject,
        currentPath
      );
      if (nestedDiff.length > 0) {
        result.push({
          type: inProject ? "modified" : "unchanged",
          key,
          path: currentPath,
          globalValue: globalVal,
          projectValue: projectVal,
          mergedValue: mergedVal,
        });
      } else {
        result.push({
          type: "unchanged",
          key,
          path: currentPath,
          mergedValue: mergedVal,
        });
      }
    } else if (inProject && !inGlobal) {
      // Added by project only
      result.push({
        type: "added",
        key,
        path: currentPath,
        projectValue: projectVal,
        mergedValue: mergedVal,
      });
    } else if (inProject && inGlobal) {
      // Modified by project
      if (JSON.stringify(globalVal) !== JSON.stringify(projectVal)) {
        result.push({
          type: "modified",
          key,
          path: currentPath,
          globalValue: globalVal,
          projectValue: projectVal,
          mergedValue: mergedVal,
        });
      } else {
        result.push({
          type: "unchanged",
          key,
          path: currentPath,
          mergedValue: mergedVal,
        });
      }
    } else {
      // From global only
      result.push({
        type: "unchanged",
        key,
        path: currentPath,
        globalValue: globalVal,
        mergedValue: mergedVal,
      });
    }
  }

  return result;
}

function formatDiffLines(diffLines: DiffLine[], indentLevel: number): string[] {
  const result: string[] = [];
  const indent = "  ".repeat(indentLevel);

  for (let i = 0; i < diffLines.length; i++) {
    const diff = diffLines[i];
    const isLast = i === diffLines.length - 1;
    const comma = isLast ? "" : ",";

    if (diff.type === "added") {
      const valueStr = formatJsonValue(diff.mergedValue, indentLevel);
      result.push(chalk.green(`${indent}+ "${diff.key}": ${valueStr}${comma}`) + chalk.gray(" // [project]"));
    } else if (diff.type === "modified") {
      // Show removed global value
      const globalStr = formatJsonValue(diff.globalValue, indentLevel);
      result.push(chalk.red(`${indent}- "${diff.key}": ${globalStr}`) + chalk.gray(" // [global]"));
      // Show added project value
      const projectStr = formatJsonValue(diff.mergedValue, indentLevel);
      result.push(chalk.green(`${indent}+ "${diff.key}": ${projectStr}${comma}`) + chalk.gray(" // [project]"));
    } else {
      // Unchanged
      const valueStr = formatJsonValue(diff.mergedValue, indentLevel);
      result.push(`${indent}"${diff.key}": ${valueStr}${comma}`);
    }
  }

  return result;
}

function formatJsonValue(value: JsonValue | undefined, indentLevel: number): string {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const items = value.map((v) => formatJsonValue(v, indentLevel + 1));
    if (items.join(", ").length < 60) {
      return `[${items.join(", ")}]`;
    }
    const indent = "  ".repeat(indentLevel + 1);
    const closeIndent = "  ".repeat(indentLevel);
    return `[\n${items.map((item) => `${indent}${item}`).join(",\n")}\n${closeIndent}]`;
  }
  if (typeof value === "object") {
    const obj = value as JsonObject;
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return "{}";
    }
    const pairs = keys.map((k) => `"${k}": ${formatJsonValue(obj[k], indentLevel + 1)}`);
    if (pairs.join(", ").length < 60) {
      return `{ ${pairs.join(", ")} }`;
    }
    const indent = "  ".repeat(indentLevel + 1);
    const closeIndent = "  ".repeat(indentLevel);
    return `{\n${pairs.map((pair) => `${indent}${pair}`).join(",\n")}\n${closeIndent}}`;
  }
  return String(value);
}
