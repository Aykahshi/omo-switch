import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

import * as fs from "fs";

// Sample schema that matches the structure of oh-my-opencode-slim.schema.json
const mockSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "preset": { "type": "string" },
    "presets": {
      "type": "object",
      "additionalProperties": { "$ref": "#/definitions/presetConfig" },
    },
    "tmux": { "$ref": "#/definitions/tmuxConfig" },
    "disabled_mcps": {
      "type": "array",
      "items": { "type": "string" },
    },
  },
  "definitions": {
    "presetConfig": {
      "type": "object",
      "properties": {
        "orchestrator": { "$ref": "#/definitions/agentConfig" },
        "oracle": { "$ref": "#/definitions/agentConfig" },
        "librarian": { "$ref": "#/definitions/agentConfig" },
        "explorer": { "$ref": "#/definitions/agentConfig" },
        "designer": { "$ref": "#/definitions/agentConfig" },
        "fixer": { "$ref": "#/definitions/agentConfig" },
      },
      "additionalProperties": false,
    },
    "agentConfig": {
      "type": "object",
      "properties": {
        "model": { "type": "string" },
        "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
        "variant": { "type": "string", "enum": ["low", "medium", "high"] },
        "skills": { "type": "array", "items": { "type": "string" } },
        "mcps": { "type": "array", "items": { "type": "string" } },
      },
      "required": ["model"],
      "additionalProperties": false,
    },
    "tmuxConfig": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "layout": { "type": "string" },
      },
    },
  },
  "additionalProperties": false,
};

describe("OmosValidator", () => {
  let OmosValidator: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSchema));
    
    // Dynamically import to get fresh instance with mocked fs
    const mod = await import("./omos-validator");
    OmosValidator = mod.OmosValidator;
  });

  describe("validate (full config)", () => {
    it("validates a correct full config", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validate({
        preset: "default",
        presets: {
          default: {
            orchestrator: { model: "test/model" },
          },
        },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects invalid full config", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validate({
        preset: 123, // Should be string
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects additional properties in full config", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validate({
        preset: "default",
        unknownField: "value",
      } as any);

      expect(result.valid).toBe(false);
    });
  });

  describe("validatePreset", () => {
    it("validates a correct preset config", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validatePreset({
        orchestrator: { model: "test/model" },
        oracle: { model: "another/model", temperature: 0.5 },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates preset with all agent types", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validatePreset({
        orchestrator: { model: "m1" },
        oracle: { model: "m2" },
        librarian: { model: "m3" },
        explorer: { model: "m4" },
        designer: { model: "m5" },
        fixer: { model: "m6" },
      });

      expect(result.valid).toBe(true);
    });

    it("rejects preset with invalid agent config", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validatePreset({
        orchestrator: { temperature: 0.5 }, // Missing required 'model'
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects preset with unknown agent type", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validatePreset({
        orchestrator: { model: "test/model" },
        unknownAgent: { model: "test/model" },
      } as any);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateAgentConfig", () => {
    it("validates a correct agent config", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validateAgentConfig({
        model: "test/model",
        temperature: 0.7,
        variant: "medium",
        skills: ["skill1", "skill2"],
        mcps: ["mcp1"],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates minimal agent config (model only)", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validateAgentConfig({
        model: "test/model",
      });

      expect(result.valid).toBe(true);
    });

    it("rejects agent config without model", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validateAgentConfig({
        temperature: 0.5,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("model"));
    });

    it("rejects agent config with invalid temperature", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validateAgentConfig({
        model: "test/model",
        temperature: 3, // Max is 2
      });

      expect(result.valid).toBe(false);
    });

    it("rejects agent config with invalid variant", () => {
      const validator = new OmosValidator("/path/to/schema.json");
      
      const result = validator.validateAgentConfig({
        model: "test/model",
        variant: "invalid",
      } as any);

      expect(result.valid).toBe(false);
    });
  });
});
