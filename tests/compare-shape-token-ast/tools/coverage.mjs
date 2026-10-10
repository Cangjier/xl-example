import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(here, "..", "..", "..");
const validate = await import(pathToFileURL(path.join(ROOT, "tests", "parse", "validate.mjs")).href);
const { TAGS, GHOST_TAGS } = validate;

/** 本门的根目录（`tools/` 的上一层）——token 目录都在它下面。 */
const HARNESS = path.resolve(here, "..");
const dirs = fs
  .readdirSync(HARNESS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "tools")
  .map((e) => e.name);

// 目录名 → 产物标签：去掉连字符、每段首字母大写（`null-conditional-operator` → NullConditionalOperator）
const toTag = (dir) =>
  dir
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

const covered = new Map();
for (const d of dirs) covered.set(toTag(d), d);

// 有 PrintAst 覆写的 token（那些是本门最该覆盖的：它们自己出 AST 形状）
const withPrintAst = new Set();
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".xl.md")) {
      const text = fs.readFileSync(p, "utf8");
      const m = text.match(/^# class ([A-Za-z_][A-Za-z0-9_]*) /m);
      if (m && /^## method PrintAst/m.test(text)) withPrintAst.add(m[1]);
    }
  }
};
walk(path.join(ROOT, "typescript", "tokens"));

const tags = [...TAGS].sort();
const missing = tags.filter((t) => !covered.has(t));
const have = tags.filter((t) => covered.has(t));
// 目录里有、但不在标签表里的（名字写错的那种）
const stray = [...covered.keys()].filter((t) => !TAGS.has(t));

console.log(`产物标签（TAGS）${tags.length} 种；本门覆盖 ${have.length} 种、缺 ${missing.length} 种。`);
if (stray.length) console.log(`**目录名对不上标签表**：${stray.join(", ")}`);
console.log("");
console.log("=== 缺的里面，有 PrintAst 覆写的（最该先补）===");
const pri = missing.filter((t) => withPrintAst.has(t));
console.log(`  ${pri.length} 种：${pri.join(" ")}`);
console.log("");
console.log("=== 缺的里面，没有 PrintAst 的（走基类/通用支）===");
const rest = missing.filter((t) => !withPrintAst.has(t));
console.log(`  ${rest.length} 种：${rest.join(" ")}`);
console.log("");
console.log(`=== 有 PrintAst 覆写、但本来就不在标签表里的（不进本门）===`);
const ghost = [...withPrintAst].filter((t) => !TAGS.has(t)).sort();
console.log(`  ${ghost.length} 种：${ghost.join(" ")}`);
console.log("");
console.log(`（另：GHOST_TAGS ${GHOST_TAGS ? GHOST_TAGS.length : 0} 种——那是「标签表里有、产物里不该出现」的哨兵）`);
