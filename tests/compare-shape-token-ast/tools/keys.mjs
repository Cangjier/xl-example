import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(here, "..", "..", "..");
const TOK = path.join(ROOT, "typescript", "tokens");
const only = process.argv[2] ?? "";

// XML 里当子元素用的段键（与 tests/compare-shape-token-ast/run.mjs 的 FLAT_KEYS 同源）
const SEGMENT_KEYS = new Set([
  "children", "compare", "body", "initial", "next", "define", "enumable", "condition", "statement",
  "catches", "finally", "trueStatement", "falseStatement", "parameters", "returnType", "name",
  "arguments", "segments",
]);

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".xl.md")) files.push(p);
  }
};
walk(TOK);

const rows = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (only && !rel.replace(/\\/g, "/").includes(only)) continue;
  const text = fs.readFileSync(file, "utf8");
  const bodyOf = (head) => {
    const i = text.indexOf(head);
    if (i < 0) return "";
    const j = text.indexOf("```ts", i);
    if (j < 0) return "";
    const k = text.indexOf("```", j + 5);
    return text.slice(j, k);
  };
  const xml = bodyOf("## method ToXmlString");
  if (!xml) continue; // 没覆写 ⇒ 属性由基类出（只有 range）
  const json = bodyOf("## method ToDictionary");
  const xmlKeys = new Set([...xml.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"/g)].map((m) => m[1]));
  const jsonKeys = new Set([...json.matchAll(/result\.set\("([A-Za-z_][A-Za-z0-9_]*)"/g)].map((m) => m[1]));
  if (jsonKeys.size === 0) continue;
  const missing = [...jsonKeys].filter((k) => !xmlKeys.has(k) && k !== "type" && !SEGMENT_KEYS.has(k));
  const extra = [...xmlKeys].filter((k) => !jsonKeys.has(k) && k !== "range");
  if (missing.length === 0 && extra.length === 0) continue;
  rows.push({ rel, xmlKeys: [...xmlKeys].sort(), jsonKeys: [...jsonKeys].sort(), missing, extra });
}

console.log("=== JSON 有键、XML 开标签没印（第 2 条的账本）===");
for (const r of rows) {
  if (r.missing.length === 0) continue;
  console.log(`${r.rel}`);
  console.log(`    JSON 有：${r.missing.join(", ")}`);
}
console.log("");
console.log("=== XML 有属性、JSON 没键（应当为空）===");
let none = true;
for (const r of rows) {
  if (r.extra.length === 0) continue;
  none = false;
  console.log(`${r.rel}  →  ${r.extra.join(", ")}`);
}
if (none) console.log("  （无）");
console.log("");
console.log(`扫了 ${files.length} 个 token 文件，其中 ${rows.length} 个有差。`);
