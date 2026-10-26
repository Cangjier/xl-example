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
//
// **两条只读计数（第 D3e 波加，都不参与判据）**：
//   FileFallbackCount       靠 `EnableFileFallback` 那条 legacy 重解析才**通过**的文件数。
//                           D3 全量实测基线 **167**；超过基线只 WARN、不判红 —— 本波的任务是
//                           先把这笔隐性债**变成可读指标**，红了会把今天的 167 一起变红。
//   token 形状（basic-token）  `Data` 里摆着的记号形状（`WrapSymbol` / `Common` / `Symbol` / …）。
//                           它们**不计入** AST 对拍（见 `ast-compare.mjs` 的 `isAstShape`）：
//                           默认路径一个都没有，只有增量形状路径会把它们留在 `Data` 里。

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
  isAstShape,
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
let StatementRouteUtil;
try {
  ts = require(path.join(root, "node_modules", "typescript"));
  ({ SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js")));
  // `Parse` 的两级结构：`ParseCore(shell=true)` 抛异常 → catch → `ParseCore(shell=false)` 救回来，
  // 并置 `LastFileFallback`（成功后）与 `FileFallbackCount`（每次尝试 +1）。本条门只**读**这两个字段。
  ({ StatementRouteUtil } = require(
    path.join(root, "build", "ts", "typescript", "tokens", "statements", "statement-route-util.js"),
  ));
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
// 只累计「缺 range / 越界 / 未映射 / 记号形状」四个数。父区间用归一后的 pos/end（与 cjAst 同算法）。
function walkFoundation(shape, parent, stats) {
  // **记号形状先摘掉**：`IsBasicToken` 的形状是 token 层的（`WrapSymbol` / `Common` / `Symbol` / …），
  // 不是 AST 节点，TS 侧 `forEachChild` 从不交出它们（口径写在 `ast-compare.mjs` 的 `isAstShape`）。
  // 只计数、不递归 —— basic token 是叶子（字符收在 `Temp` 里，不再挂子形状）。
  if (!isAstShape(shape)) {
    stats.tokens.push(shape.constructor.name.replace("Shape", ""));
    return;
  }
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
  const foundation = { missingRange: [], outOfBounds: [], unmapped: [], tokens: [] };
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
let tokenTotal = 0;
// **隐性债的两个只读计数器**：`FileFallbackCount` 数「靠 legacy 重解析才通过」的文件数（基线 167），
// 按目录族分桶；两者都**不进** `broken`，只印出来 + 过基线时 WARN。
let fileFallbackCount = 0;
const fallbackFamilies = new Map();
// **基线按量尺分两条**（同一件事在两把尺子上差两个数量级，写死一条就是错的红线）：
//   · 默认路径（本门自己的读数）：**2** —— 全语料只有 2 件走 shell 路径失败；
//   · 增量形状 ON（`tmp/wide-on.mjs`，D3 §4 的 167 就是在这一把尺子上量的）：**167**。
const incrementalOn =
  StatementRouteUtil.EnableIncrementalShapes === true || StatementRouteUtil.EnableIncrementalVariableShapes === true;
const FALLBACK_BASELINE = incrementalOn ? 167 : 2;

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
  // `LastFileFallback` 是「这一次 `Parse` 是靠 `ParseCore(shell=false)` 救回来的」；救不回的
  // （= 崩溃）根本走不到这里，所以这个数就是「靠 fallback 才通过的文件数」。
  if (StatementRouteUtil.LastFileFallback) {
    fileFallbackCount++;
    const family = path.relative(root, file).replace(/\\/g, "/").split("/").slice(0, 3).join("/");
    fallbackFamilies.set(family, (fallbackFamilies.get(family) || 0) + 1);
  }
  structuralTotal += result.structural.length;
  movedTotal += result.moved.length;
  fieldTotal += result.fields.length;
  missingRangeTotal += result.missingRange.length;
  outOfBoundsTotal += result.outOfBounds.length;
  unmappedTotal += result.unmapped.length;
  tokenTotal += result.tokens.length;
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
// **记号形状**：不计入 AST，只报数量当证据 —— 0 说明这一趟走的是默认路径（没有增量形状残留）。
console.log(
  `记号形状（basic-token，按 isAstShape 不计入 AST）：${tokenTotal} 个` +
    (tokenTotal > 0 ? `；它们本来是「未映射」与假结构差的来源` : "；本趟默认路径没有残留"),
);
// **隐性债（只读 + 阈值告警，不判红）**：默认禁用宽度下，约 11% 的语料其实走的是 legacy 重解析。
console.log(
  `FileFallbackCount ${fileFallbackCount}（靠 EnableFileFallback legacy 重解析才通过的文件数；` +
    `基线 ${FALLBACK_BASELINE}${incrementalOn ? "，增量形状 ON / D3 §4 实测 167" : "，默认路径 / D3e 实测"}）`,
);
console.log(
  `FileFallbackAttempts ${StatementRouteUtil.FileFallbackCount}（Parse 层 fallback 尝试次数，含救不回的崩溃）`,
);
if (fallbackFamilies.size > 0) {
  const top = [...fallbackFamilies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`FileFallbackByFamily ${top.map(([name, count]) => `${name}=${count}`).join("、")}`);
}
if (fileFallbackCount > FALLBACK_BASELINE) {
  console.log(
    `WARN FileFallbackCount 比基线 ${FALLBACK_BASELINE} 多了 ${fileFallbackCount - FALLBACK_BASELINE} 个文件` +
      `（隐性债增长；本波只告警不判红，见 _reports/D3e.md）`,
  );
}
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
