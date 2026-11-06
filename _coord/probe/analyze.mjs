// 从 fp-<label>.json / report-<label>.json 生成 P5 现状表（只读）
// 用法: node _coord/probe/analyze.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), "utf8"));

const base = read("fp-base.json");
const report = read("report-base.json");
const fallback = new Set(report.fallbackIds);

const ids = Object.keys(base.cases).sort();
console.log("== success 全量 ==");
console.log(`case=${ids.length}  fallback=${fallback.size}  clean=${ids.length - fallback.size}`);

// 只看 types 区
const types = ids.filter((id) => id.includes("/types/"));
console.log(`\n== success/types 共 ${types.length} ==`);

const byFallback = types.filter((id) => fallback.has(id));
const byClean = types.filter((id) => !fallback.has(id));

const row = (id) => {
  const c = base.cases[id];
  return { id, forms: c.forms, chars: c.chars, api: c.api, sites: c.sites };
};

console.log(`\n-- A. 走 Close 全量兜底（${byFallback.length}） --`);
for (const id of byFallback) {
  const r = row(id);
  console.log(`  ${id.replace("success/types/", "")}  chars=${r.chars}  api=${JSON.stringify(r.api)}  forms=[${r.forms.join(", ")}]`);
}

console.log(`\n-- B. 已完整增量建出（HasBuiltType 路径，${byClean.length}） --`);
for (const id of byClean) {
  const r = row(id);
  console.log(`  ${id.replace("success/types/", "")}  chars=${r.chars}  forms=[${r.forms.join(", ")}]`);
}

// 形式分布：兜底集合内
const formCount = new Map();
for (const id of byFallback) {
  for (const f of base.cases[id].forms) formCount.set(f, (formCount.get(f) ?? 0) + 1);
}
console.log(`\n== 兜底集合的形式分布（一 case 可多形式） ==`);
for (const [f, n] of [...formCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
  const who = byFallback.filter((id) => base.cases[id].forms.includes(f)).map((id) => id.replace("success/types/", ""));
  console.log(`  ${String(n).padStart(3)}  ${f.padEnd(16)} ${who.join(", ")}`);
}

// 每个形式的净归属（只有该形式的 case）
console.log(`\n== 形式 -> 独占 case（用于 WP 目标清单切分） ==`);
const formToIds = new Map();
for (const id of byFallback) {
  for (const f of base.cases[id].forms) {
    if (!formToIds.has(f)) formToIds.set(f, []);
    formToIds.get(f).push(id.replace("success/types/", ""));
  }
}
for (const [f, arr] of [...formToIds.entries()].sort()) console.log(`  ${f.padEnd(16)} ${arr.join(", ")}`);

// todo/incremental/types
const fpTodo = read("fp-todo.json");
const todoTypes = Object.keys(fpTodo.cases).filter((id) => id.includes("/types/")).sort();
console.log(`\n== todo/incremental/types 共 ${todoTypes.length} ==`);
for (const id of todoTypes) {
  const c = fpTodo.cases[id];
  console.log(`  ${id.replace("todo/incremental/types/", "").padEnd(34)} forms=[${c.forms.join(", ")}]  ${c.error ? "ERR" : "parsed"}`);
}
