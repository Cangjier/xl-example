// 校验：638 个 *.xl.md 是否都被某篇文档以「小节标题」的形式覆盖
import fs from "node:fs";
import path from "node:path";

function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (/^(node_modules|dist|build|tmp|tests|samples|\.git|\.xl)$/.test(e.name)) continue;
      walk(f, o);
    } else if (e.name.endsWith(".xl.md")) o.push(path.relative(process.cwd(), f).replace(/\\/g, "/"));
  }
  return o;
}
const all = walk(process.cwd()).sort();
const set = new Set(all);

const dir = path.join(process.cwd(), "docs", "importance-1028");
const docs = fs.readdirSync(dir).filter((f) => /^\d\d-/.test(f) && f.endsWith(".md") && !/^(00|01|99)/.test(f)).sort();
const covered = new Map();
const headingRe = /^###\s+((?:core|typescript|cjcli)[^\s（(]*)/gm;
// 表格型文档里的文件名（只写 basename）
const basenameOf = (p) => p.split("/").pop();

for (const d of docs) {
  const text = fs.readFileSync(path.join(dir, d), "utf8");
  for (const m of text.matchAll(headingRe)) {
    const p = m[1];
    if (set.has(p)) covered.set(p, (covered.get(p) || []).concat(d));
  }
  // 表格行：| `xxx.xl.md` | 或 | `dir/xxx.xl.md` |
  for (const m of text.matchAll(/\|\s*`((?:[A-Za-z0-9.\-_]+\/)*[A-Za-z0-9.\-_]+\.xl\.md)`\s*\|/g)) {
    const raw = m[1];
    const hit = set.has(raw) ? raw : all.find((p) => basenameOf(p) === basenameOf(raw));
    if (hit) covered.set(hit, (covered.get(hit) || []).concat(d));
  }
}

const missing = all.filter((p) => !covered.has(p));
console.log("文件总数:", all.length, "| 已覆盖:", covered.size, "| 未覆盖:", missing.length);
if (missing.length) {
  const byDir = new Map();
  for (const m of missing) {
    const k = m.split("/").slice(0, -1).join("/");
    byDir.set(k, (byDir.get(k) || 0) + 1);
  }
  console.log("未覆盖按目录：");
  for (const [k, v] of [...byDir.entries()].sort()) console.log(`  ${k}: ${v}`);
  console.log("前 20 个未覆盖文件：");
  for (const m of missing.slice(0, 20)) console.log("  " + m);
}
const multi = [...covered.entries()].filter(([, ds]) => new Set(ds).size > 1);
console.log("被多篇同时覆盖的文件:", multi.length);
for (const [p, ds] of multi.slice(0, 10)) console.log("  " + p + " -> " + [...new Set(ds)].join(","));
