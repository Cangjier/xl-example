// xl:title 格式化管道：一串转换器 + 错误收集
// xl:round 371
// xl:judge stdout
// xl:end
type Transform = { name: string; apply: (s: string) => string };
function pipeline(transforms: Transform[], input: string): { out: string; applied: string[]; errors: string[] } {
  let out = input;
  const applied: string[] = [];
  const errors: string[] = [];
  for (const t of transforms) {
    try {
      out = t.apply(out);
      applied.push(t.name);
    } catch (e) {
      errors.push(t.name + ": " + (e as Error).message);
    }
  }
  return { out, applied, errors };
}
const transforms: Transform[] = [
  { name: "trim", apply: (s) => s.trim() },
  { name: "collapse", apply: (s) => s.split(" ").filter((p) => p !== "").join(" ") },
  { name: "upper-first", apply: (s) => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)) },
  { name: "boom", apply: () => { throw new Error("always fails"); } },
  { name: "suffix", apply: (s) => s + "." },
];
const r = pipeline(transforms, "   hello   world  ");
console.log(JSON.stringify(r.out), r.applied.join(","), r.errors.join("|"));
console.log(pipeline([], "unchanged").out);
console.log(JSON.stringify(pipeline([{ name: "empty", apply: () => "" }], "x").out));
