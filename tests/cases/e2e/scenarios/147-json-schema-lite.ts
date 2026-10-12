// xl:title 极简 JSON Schema 校验：类型、必需、数组项、枚举
// xl:round 371
// xl:judge stdout
// xl:end
type Schema = {
  type: "object" | "array" | "string" | "number" | "boolean";
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: unknown[];
  minLength?: number;
};
function validate(value: unknown, schema: Schema, path = "$"): string[] {
  const errors: string[] = [];
  const typeOf = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (schema.enum && !schema.enum.some((e) => e === value)) errors.push(path + ": not in enum");
  if (typeOf !== schema.type) { errors.push(path + ": expected " + schema.type + " got " + typeOf); return errors; }
  if (schema.type === "string" && schema.minLength !== undefined && (value as string).length < schema.minLength) {
    errors.push(path + ": shorter than " + schema.minLength);
  }
  if (schema.type === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!(key in obj)) errors.push(path + "." + key + ": required");
    for (const key of Object.keys(schema.properties ?? {})) {
      if (key in obj) errors.push(...validate(obj[key], (schema.properties as Record<string, Schema>)[key], path + "." + key));
    }
  }
  if (schema.type === "array" && schema.items) {
    (value as unknown[]).forEach((item, index) => errors.push(...validate(item, schema.items as Schema, path + "[" + index + "]")));
  }
  return errors;
}
const schema: Schema = {
  type: "object",
  required: ["name", "tags"],
  properties: {
    name: { type: "string", minLength: 3 },
    age: { type: "number" },
    role: { type: "string", enum: ["admin", "user"] },
    tags: { type: "array", items: { type: "string", minLength: 2 } },
  },
};
const samples: unknown[] = [
  { name: "ann", tags: ["ab"] },
  { name: "bo", tags: ["a", "bcd"], role: "admin", age: 30 },
  { tags: [], role: "ghost" },
  "not-an-object",
];
for (const s of samples) console.log(validate(s, schema).length, validate(s, schema).join(" | "));
