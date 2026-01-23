import { describe, expect, it } from "vitest";
import { join } from "path";

import { Validator, getSchemaPath } from "./validator";

const FIXTURES_DIR = join(__dirname, "..", "__tests__", "fixtures");

describe("Validator", () => {
  it("creates validator without schema", () => {
    expect(new Validator()).toBeDefined();
  });

  it("validates a basic config against bundled schema fixture", () => {
    const schemaPath = join(FIXTURES_DIR, "oh-my-opencode.schema.json");
    const validator = new Validator(schemaPath);

    // Keep it minimal: schema generally accepts additional keys; include $schema for realism
    const config = {
      $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
      agents: {
        build: {
          model: "opencode/glm-4.7-free",
        },
      },
    };

    const result = validator.validate(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns error when schema not loaded", () => {
    const validator = new Validator();
    const result = validator.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Schema not found or not loaded");
  });

  it("getSchemaPath constructs cache schema path", () => {
    const path = getSchemaPath("/cache/schema");
    expect(path).toContain("oh-my-opencode.schema.json");
  });
});
