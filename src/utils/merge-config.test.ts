import { describe, it, expect, beforeEach, vi } from "vitest";
import { deepMerge, generateDiffOutput } from "./merge-config";

describe("merge-config", () => {
  beforeEach(() => {
    vi.mock("chalk", () => ({
      gray: (s: string) => s,
      green: (s: string) => s,
      red: (s: string) => s,
    }));
  });

  describe("deepMerge", () => {
    it("should merge simple objects", () => {
      const base = { a: 1, b: 2 };
      const override = { b: 3, c: 4 };
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("should merge nested objects", () => {
      const base = { config: { a: 1, b: 2 } };
      const override = { config: { b: 3, c: 4 } };
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).toEqual({ config: { a: 1, b: 3, c: 4 } });
    });

    it("should add keys only in override", () => {
      const base = { a: 1 };
      const override = { b: 2, c: 3 };
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should preserve keys only in base when not overridden", () => {
      const base = { a: 1, b: 2, c: 3 };
      const override = { b: 99 };
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).toEqual({ a: 1, b: 99, c: 3 });
    });

    it("should handle deep nesting", () => {
      const base = { a: { b: { c: { d: 1 } } } };
      const override = { a: { b: { c: { e: 2 } } } };
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).toEqual({ a: { b: { c: { d: 1, e: 2 } } } });
    });

    it("should handle arrays as values", () => {
      const base = { items: ["a", "b"] };
      const override = { items: ["c", "d"] };
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).toEqual({ items: ["c", "d"] });
    });

    it("should handle null values", () => {
      const base = { a: 1, b: null };
      const override = { b: "value" };
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).toEqual({ a: 1, b: "value" });
    });

    it("should create new object (not mutate inputs)", () => {
      const base = { a: 1 };
      const override = { b: 2 };
      
      const result = deepMerge(base, override) as Record<string, unknown>;

      expect(result).not.toBe(base);
      expect(result).not.toBe(override);
      expect(base).toEqual({ a: 1 });
      expect(override).toEqual({ b: 2 });
    });

    it("should handle empty objects", () => {
      const result = deepMerge({}, {}) as Record<string, unknown>;
      expect(result).toEqual({});
    });

    it("should handle override with empty object", () => {
      const base = { a: 1, b: 2 };
      const result = deepMerge(base, {}) as Record<string, unknown>;
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe("generateDiffOutput", () => {
    it("should generate output for simple config", () => {
      const global = { a: 1 };
      const merged = { a: 1, b: 2 };
      const projectOverrides = { b: 2 };

      const result = generateDiffOutput(global, merged, projectOverrides);

      expect(result).toContain("Merged configuration");
      expect(result).toContain("+ \"b\": 2");
      expect(result).toContain("// [project]");
    });

    it("should show modified values", () => {
      const global = { a: 1 };
      const merged = { a: 2 };
      const projectOverrides = { a: 2 };

      const result = generateDiffOutput(global, merged, projectOverrides);

      expect(result).toContain('- "a": 1');
      expect(result).toContain('+ "a": 2');
      expect(result).toContain("// [global]");
      expect(result).toContain("// [project]");
    });

    it("should show unchanged values without markers", () => {
      const global = { a: 1 };
      const merged = { a: 1 };

      const result = generateDiffOutput(global, merged, {});

      expect(result).toContain('"a": 1');
      // avoid asserting on '+'/'-' because the header contains a dashed line
      expect(result).not.toContain("// [project]");
      expect(result).not.toContain("// [global]");
    });

  it("should handle nested object diffs", () => {
      const global = { config: { a: 1 } };
      const merged = { config: { a: 1, b: 2 } };
      const projectOverrides = { config: { b: 2 } };

      const result = generateDiffOutput(global, merged, projectOverrides);

      expect(result).toContain('"b": 2');
      expect(result).toContain('// [project]');
    });

    it("should show correct paths in diff", () => {
      const global = { agents: { oracle: { model: "old" } } };
      const merged = { agents: { oracle: { model: "new" } } };
      const projectOverrides = { agents: { oracle: { model: "new" } } };

      const result = generateDiffOutput(global, merged, projectOverrides);

      expect(result).toContain('"model": "old"');
      expect(result).toContain('"model": "new"');
      expect(result).toContain('// [global]');
      expect(result).toContain('// [project]');
    });

    it("should format arrays correctly", () => {
      const global = { items: ["a"] };
      const merged = { items: ["a", "b"] };
      const projectOverrides = { items: ["a", "b"] };

      const result = generateDiffOutput(global, merged, projectOverrides);

      expect(result).toContain("items");
    });

    it("should handle project-only config", () => {
      const global = {};
      const merged = { a: 1 };
      const projectOverrides = { a: 1 };

      const result = generateDiffOutput(global, merged, projectOverrides);

      expect(result).toContain("+ \"a\": 1");
      expect(result).toContain("// [project]");
    });

    it("should handle global-only config", () => {
      const global = { a: 1 };
      const merged = { a: 1 };
      const projectOverrides = {};

      const result = generateDiffOutput(global, merged, projectOverrides);

      expect(result).toContain('"a": 1');
      expect(result).not.toContain("// [project]");
      expect(result).not.toContain("// [global]");
    });
  });

  vi.unmock("chalk");
});
