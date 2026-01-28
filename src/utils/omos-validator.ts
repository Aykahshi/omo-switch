import * as fs from "fs";
import Ajv from "ajv";
import { OmosConfig, OmosPresetConfig, OmosAgentConfig } from "../store";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates OMOS configurations against the oh-my-opencode-slim schema.
 * Supports validation of full configs, individual presets, and agent configs.
 */
export class OmosValidator {
  private readonly ajv: Ajv;
  private readonly schema: Record<string, unknown>;
  private readonly validateFullConfig: ReturnType<Ajv["compile"]>;
  private readonly validatePresetConfig: ReturnType<Ajv["compile"]>;
  private readonly validateAgentConfigFn: ReturnType<Ajv["compile"]>;

  constructor(schemaPath: string) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    this.schema = JSON.parse(schemaContent);

    // Compile full config validator
    this.validateFullConfig = this.ajv.compile(this.schema);

    // Extract and compile preset config validator
    const presetConfigDef = (this.schema as any).definitions?.presetConfig;
    if (presetConfigDef) {
      // Create a standalone schema for preset validation
      const presetSchema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        ...presetConfigDef,
        definitions: (this.schema as any).definitions,
      };
      this.validatePresetConfig = this.ajv.compile(presetSchema);
    } else {
      // Fallback: create a permissive preset validator
      this.validatePresetConfig = this.ajv.compile({
        type: "object",
        additionalProperties: true,
      });
    }

    // Extract and compile agent config validator
    const agentConfigDef = (this.schema as any).definitions?.agentConfig;
    if (agentConfigDef) {
      const agentSchema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        ...agentConfigDef,
      };
      this.validateAgentConfigFn = this.ajv.compile(agentSchema);
    } else {
      // Fallback: require at least a model field
      this.validateAgentConfigFn = this.ajv.compile({
        type: "object",
        properties: {
          model: { type: "string" },
        },
        required: ["model"],
      });
    }
  }

  /**
   * Validate a full OMOS configuration.
   */
  validate(config: OmosConfig): ValidationResult {
    const valid = this.validateFullConfig(config);
    
    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = (this.validateFullConfig.errors || []).map((err) => {
      const path = err.instancePath || "/";
      return `${path}: ${err.message}`;
    });

    return { valid: false, errors };
  }

  /**
   * Validate a single preset configuration.
   * This validates the structure that would go into presets[presetName].
   */
  validatePreset(preset: OmosPresetConfig): ValidationResult {
    const valid = this.validatePresetConfig(preset);
    
    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = (this.validatePresetConfig.errors || []).map((err) => {
      const path = err.instancePath || "/";
      return `${path}: ${err.message}`;
    });

    return { valid: false, errors };
  }

  /**
   * Validate a single agent configuration.
   */
  validateAgentConfig(agent: OmosAgentConfig): ValidationResult {
    const valid = this.validateAgentConfigFn(agent);
    
    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = (this.validateAgentConfigFn.errors || []).map((err) => {
      const path = err.instancePath || "/";
      return `${path}: ${err.message}`;
    });

    return { valid: false, errors };
  }
}
