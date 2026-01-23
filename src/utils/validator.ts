import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as fs from "fs";
import * as path from "path";

export class Validator {
  private ajv: Ajv;
  private compiledSchema: ReturnType<Ajv["compile"]> | null = null;
  private schemaId: string | null = null;

  constructor(schemaPath?: string) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);

    if (schemaPath && fs.existsSync(schemaPath)) {
      const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
      this.ajv.addSchema(schema);
      if (schema.$id) {
        this.schemaId = schema.$id;
      }
      this.compiledSchema = this.ajv.compile(schema);
    }
  }

  validate(data: Record<string, unknown>, schemaRefOrId?: string): { valid: boolean; errors: string[] } {
    let validate: ReturnType<Ajv["compile"]> | null = null;

    if (schemaRefOrId) {
      validate = this.ajv.getSchema(schemaRefOrId) ?? null;
    } else if (this.compiledSchema) {
      validate = this.compiledSchema;
    }

    if (!validate) {
      return { valid: false, errors: ["Schema not found or not loaded"] };
    }

    const valid = validate(data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = (validate.errors || []).map((err) => {
      const field = err.instancePath || "(root)";
      return `${field}: ${err.message}`;
    });

    return { valid: false, errors };
  }
}

export function getSchemaPath(cacheDir: string): string {
  return path.join(cacheDir, "oh-my-opencode.schema.json");
}
