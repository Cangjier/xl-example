// **宽尺子（正式门）**：把 `_coord/diag-wide-ast.mjs` 的诊断口径收成仓库门。
//
// 它量的是**本仓库自己的直建产物**：`build/ts/typescript/run/source-file-runner.js` 的
// `SourceFileRunner.Parse`，语料是 node_modules 的 `.d.ts`、`dist/ts/**`、`samples/**`、
// `tests/cases/token/**`（约 2505 件；`tests/parse/ts-ast.mjs` 的 print-ast-common 那条产物线
// 在本仓库不存在，见 tests/MIGRATION.md）。
//
//   node tests/parse/wide-ast.mjs                 # 门禁：任一崩溃 / 差异 / 缺 range / 越界 → 退出码 1
//   node tests/parse/wide-ast.mjs --verbose       # 逐文件展开差异明细
//   node tests/parse/wide-ast.mjs --per-file      # 每个文件一行状态（排障用）
//   node tests/parse/wide-ast.mjs --top 20        # 失败清单 / 目录族只印前 20 条（0 = 不限）
//   node tests/parse/wide-ast.mjs --only <子串>   # 只跑路径匹配的文件（定位用）
//
// **唯一 cjAst 口径**：本门**不再抄一份投影代码**，TS 侧 `tsAst` 与产物侧 `cjAst` 全部
// 从 `typescript/cases/ast-compare.mjs` import（与 ast-json / ast-json-diff / real-dts-ast 同源）。
// 本文件只额外做两件投影之外的事：
//   1. 四方向对拍（结构 / 位置 / 字段），与 real-dts-ast、ast-json-diff 同规则；
//   2. 两栏地基（缺 range / 越界）与「未映射」计数 —— 这些要读形状对象的原始字段，
//      所以单独走一遍形状树，但不产生第二份可比 AST。
//
// 判据（差异数 > 0 或崩溃 > 0 ⇒ exit 1；地基非 0 同样判红）：
//   structural  某类节点个数不同（缺 / 多出来）
//   moved       同类第 n 个节点区间不同（漂移）
//   fields      text / name / isTypeOnly / attributes / namedBindings
//   missingRange 形状没有 SourceRange / StartIndex 或 EndIndex < 0
//   outOfBounds  子节点区间越出父节点区间 / 反向区间
//   unmapped     产物侧出现了 ts.SyntaxKind 里不存在的 kind（等价于投影层缺映射；
//                正常情况下它必然同时表现为 structural 差）

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  TS_KIND_ALIASES,
  createAstCore,
  cjAst,
  flatten,
  groupByKind,
  FIELD_NAMES,
  fieldOf,
} from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);

// **BUILD-MISSING 而不是崩溃**：门在加载产物前先看两样东西在不在，缺了就说清楚要跑什么。
const REQUIRED = [
  ["node_modules/typescript/package.json", "TypeScript 依赖（npm install）"],
  ["build/ts/typescript/run/source-file-runner.js", "编译产物（npm run build = xl build + tsc）"],
];
const missing = REQUIRED.filter(([rel]) => !fs.existsSync(path.join(root, rel)));
if (missing.length > 0) {
  console.error("BUILD-MISSING 宽尺子需要先构建：");
  for (const [rel, why] of missing) console.error(`  缺 ${rel} —— ${why}`);
  console.error("  cwd: " + root);
  process.exit(1);
}

let ts;
let SourceFileRunner;
try {
  ts = require(path.join(root, "node_modules", "typescript"));
  ({ SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js")));
} catch (error) {
  console.error("BUILD-MISSING 产物无法加载（重新跑 npm run build）：" + String(error && error.message));
  process.exit(1);
}

const { tsAst } = createAstCore(ts);

// 产物侧合法的 kind 全集（ts.SyntaxKind 的规范名，别名按唯一口径折回）。
const CANONICAL_KINDS = new Set();
for (const value of Object.values(ts.SyntaxKind)) {
  if (typeof value !== "number") continue;
  const name = ts.SyntaxKind[value];
  if (name) CANONICAL_KINDS.add(TS_KIND_ALIASES.get(name) || name);
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = "") => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const verbose = flag("--verbose");
const perFile = flag("--per-file");
const topRaw = Number(value("--top", "0"));
const top = Number.isFinite(topRaw) && topRaw > 0 ? Math.floor(topRaw) : 0; // 0 = 不限
const only = value("--only", "") || null;
const show = (list) => (top > 0 ? list.slice(0, top) : list);

function collectFiles() {
  const files = [];
  const walk = (dir, exts) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full, exts);
      else if (exts.some((ext) => name.endsWith(ext))) files.push(full);
    }
  };
  walk(path.join(root, "node_modules", "typescript", "lib"), [".d.ts"]);
  walk(path.join(root, "node_modules", "@types", "node"), [".d.ts"]);
  walk(path.join(root, "node_modules", "undici-types"), [".d.ts"]);
  walk(path.join(root, "dist", "ts"), [".ts"]);
  walk(path.join(root, "samples"), [".ts"]);
  walk(path.join(root, "tests", "cases", "token"), [".ts"]);
  return files;
}

// **地基**：读形状对象的原始区间字段。它不是第二份投影 —— 不比较 kind / text / children，
// 只累计「缺 range / 越界 / 未映射」三个数。父区间用归一后的 pos/end（与 cjAst 同算法）。
function walkFoundation(shape, parent, stats) {
  const range = shape.SourceRange || {};
  const start = typeof range.StartIndex === "number" ? range.StartIndex : -1;
  const end = typeof range.EndIndex === "number" ? range.EndIndex : -1;
  const kind = shape.constructor.name.replace("Shape", "");
  if (start < 0 || end < 0) stats.missingRange.push(kind);
  else if (end < start) stats.outOfBounds.push(`${kind} 反向区间 ${start}-${end}`);
  if (!CANONICAL_KINDS.has(kind)) stats.unmapped.push(kind);
  const pos = shape.Pos >= 0 ? shape.Pos : start >= 0 ? start : 0;
  const nodeEnd = end >= 0 ? end : 0;
  if (parent && shape.Pos >= 0 && (pos < parent.pos || nodeEnd > parent.end)) {
    stats.outOfBounds.push(`${kind} ${pos}-${nodeEnd} 越出父 ${parent.kind} ${parent.pos}-${parent.end}`);
  }
  const self = { kind, pos, end: nodeEnd };
  for (const child of shape.Data || []) walkFoundation(child, self, stats);
}

function diffOne(file, src) {
  const fileNode = ts.createSourceFile(path.basename(file), src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (fileNode.parseDiagnostics || []).length;
  // TS 自己就非法的文件跳过（与 real-dts-ast / diag-wide-ast 同口径），否则量的是 TS 的错误恢复。
  if (diagnostics > 0) return { skipped: true };
  let rootShape;
  try {
    rootShape = SourceFileRunner.Parse(src, path.basename(file));
  } catch (error) {
    let message = "";
    for (let node = error; node; node = node.InnerException || node.innerException) {
      const text = node.Message || node.message;
      if (text) message = String(text);
    }
    return { error: (message.split("\n")[0] || "unknown").slice(0, 160) };
  }
  const foundation = { missingRange: [], outOfBounds: [], unmapped: [] };
  for (const shape of rootShape.Data || []) walkFoundation(shape, null, foundation);

  const theirs = flatten(fileNode.statements.map(tsAst));
  const ours = flatten((rootShape.Data || []).map((shape) => cjAst(shape)));
  const theirKinds = groupByKind(theirs);
  const ourKinds = groupByKind(ours);

  const structural = [];
  for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
    const delta = (ourKinds.get(kind)?.length || 0) - (theirKinds.get(kind)?.length || 0);
    if (delta !== 0) structural.push(`${kind}${delta > 0 ? "+" : ""}${delta}`);
  }
  const moved = [];
  const fields = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    // 与 ast-json-diff 同规则：个数不同就不配对位置（结构差会盖住同类的位置差）。
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let index = 0; index < theirList.length; index++) {
      if (theirList[index].pos !== ourList[index].pos || theirList[index].end !== ourList[index].end) {
        moved.push(`${kind}[${index}] ${theirList[index].pos}-${theirList[index].end} vs ${ourList[index].pos}-${ourList[index].end}`);
      }
      for (const name of FIELD_NAMES) {
        const a = fieldOf(theirList[index], name);
        const b = fieldOf(ourList[index], name);
        if (String(a) !== String(b)) fields.push(`${kind}[${index}].${name} ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
    }
  }
  return { structural, moved, fields, ...foundation };
}

const allFiles = collectFiles();
const files = only
  ? allFiles.filter((file) => path.relative(root, file).replace(/\\/g, "/").includes(only))
  : allFiles;

let identical = 0;
let crashed = 0;
let diffed = 0;
let skipped = 0;
const failures = [];
const families = new Map();
let structuralTotal = 0;
let movedTotal = 0;
let fieldTotal = 0;
let missingRangeTotal = 0;
let outOfBoundsTotal = 0;
let unmappedTotal = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const result = diffOne(file, src);
  const label = path.relative(root, file);
  if (result.skipped) {
    skipped++;
    if (perFile) console.log(`SKIP  ${label}`);
    continue;
  }
  if (result.error) {
    crashed++;
    failures.push(`${label}  CRASH  ${result.error}`);
    if (perFile) console.log(`CRASH ${label}  ${result.error}`);
    continue;
  }
  structuralTotal += result.structural.length;
  movedTotal += result.moved.length;
  fieldTotal += result.fields.length;
  missingRangeTotal += result.missingRange.length;
  outOfBoundsTotal += result.outOfBounds.length;
  unmappedTotal += result.unmapped.length;
  const clean =
    result.structural.length === 0 &&
    result.moved.length === 0 &&
    result.fields.length === 0 &&
    result.missingRange.length === 0 &&
    result.outOfBounds.length === 0;
  if (clean) {
    identical++;
    if (perFile) console.log(`OK    ${label}`);
    continue;
  }
  diffed++;
  const family = path.dirname(label).split(path.sep).slice(0, 3).join("/");
  if (!families.has(family)) families.set(family, []);
  families.get(family).push(label);
  failures.push(
    `${label}  structural=${result.structural.length} moved=${result.moved.length} fields=${result.fields.length}` +
      ` missingRange=${result.missingRange.length} outOfBounds=${result.outOfBounds.length}` +
      (result.unmapped.length > 0 ? ` unmapped=${result.unmapped.length}` : ""),
  );
  if (perFile) console.log(`DIFF  ${label}`);
  if (verbose) {
    console.log(`FILE ${label}`);
    for (const line of result.structural.slice(0, 12)) console.log(`    structural   ${line}`);
    for (const line of result.moved.slice(0, 12)) console.log(`    moved        ${line}`);
    for (const line of result.fields.slice(0, 12)) console.log(`    fields       ${line}`);
    for (const line of result.missingRange.slice(0, 6)) console.log(`    missingRange ${line}`);
    for (const line of result.outOfBounds.slice(0, 6)) console.log(`    outOfBounds  ${line}`);
    for (const line of result.unmapped.slice(0, 6)) console.log(`    unmapped     ${line}`);
  }
}

const corpus = { "node_modules .d.ts": 0, "dist/ts .ts": 0, "samples .ts": 0, "tests/cases/token .ts": 0 };
for (const file of allFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel.startsWith("node_modules/")) corpus["node_modules .d.ts"]++;
  else if (rel.startsWith("dist/ts/")) corpus["dist/ts .ts"]++;
  else if (rel.startsWith("samples/")) corpus["samples .ts"]++;
  else if (rel.startsWith("tests/cases/token/")) corpus["tests/cases/token .ts"]++;
}

console.log(`root: ${root}`);
console.log(
  `语料 ${allFiles.length} 个文件：${Object.entries(corpus).map(([k, v]) => `${k}=${v}`).join("、")}` +
    (only ? `；--only "${only}" 选中 ${files.length} 个` : ""),
);
console.log(
  `跳过 TS 非法 ${skipped}；解析成功 ${files.length - skipped - crashed}、崩溃 ${crashed}；` +
    `AST 完全一致 ${identical}、有差异 ${diffed}`,
);
console.log(
  `四方向：缺/多出来 ${structuralTotal} 条、区间漂移 ${movedTotal} 条、字段名 ${fieldTotal} 条；` +
    `地基：缺 range ${missingRangeTotal} 处、区间越界 ${outOfBoundsTotal} 处、未映射 ${unmappedTotal} 处`,
);
if (families.size > 0) {
  console.log("失败文件按目录族聚类：");
  for (const [family, list] of show([...families.entries()].sort((a, b) => b[1].length - a[1].length))) {
    console.log(`  ${String(list.length).padStart(5)}  ${family}`);
  }
}
if (failures.length > 0) {
  console.log(`失败清单（${failures.length} 个文件，按语料序${top > 0 ? `，只印前 ${top} 条` : ""}）：`);
  for (const line of show(failures)) console.log(`  ${line}`);
}

const broken = crashed + diffed + missingRangeTotal + outOfBoundsTotal;
if (broken > 0) {
  console.log(`FAIL 宽尺子：崩溃 ${crashed}、有差异 ${diffed}、缺 range ${missingRangeTotal}、越界 ${outOfBoundsTotal}`);
  process.exit(1);
}
console.log("PASS 宽尺子：全部解析成功、崩溃 0、AST 逐节点一致、地基 0 处");
process.exit(0);
