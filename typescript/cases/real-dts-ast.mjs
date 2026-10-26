// 真实 `.d.ts` 的 AST 门禁：node_modules 下 226 份手写声明（lib / @types/node / undici-types）
// 必须解析成功，且与本仓形状 AST 逐节点一致（结构 / 位置 / 字段三栏，口径同 ast-json-diff.mjs）。
//
//   node typescript/cases/real-dts-ast.mjs            # 默认档 = incremental（产品默认就是增量形状）
//   node typescript/cases/real-dts-ast.mjs --legacy   # 对照档：两开关压回 false（0 崩溃 / 0 差异）
//   node typescript/cases/real-dts-ast.mjs --verbose  # 印出每处差异
//
// **默认档的判据（D7 波）**：产品默认值翻成 `true` 之后，本门量的就是**默认解析路径**。增量档允许
// 的崩溃集合与 `tests/parse/wide-ast.mjs` **共用同一份清单**（`tests/parse/incremental-crash-expected.mjs`
// 的 5 条外部 `lib.*.d.ts`）：这 5 条是 D5 §1.2 的已知两跳缺口，换任何一条别的文件崩都必须是红，
// 差异天花板同样从那份清单来（87；本门实测 0）。`--legacy` 仍是老口径：0 崩溃、0 差异。
//
// 为什么要有这一门：typescript/cases/astjson/*.ts 是**整理过的语料**，它保证「节点种类」覆盖；
// 真实 `.d.ts` 保证「源码形态」覆盖（无分号 ambient 成员、global 增强、计算名、真实 TS 版本自己
// 的 lib 文件……）。修之前 112/226 解析崩溃、能解析的
// 114 份 AST 一致；修之后 226/226 解析成功且 226/226 AST 完全一致。
//
// **唯一对拍口径**：tsAst / cjAst / flatten / groupByKind / fieldOf 全部从 `./ast-compare.mjs` import。
// 本文件以前自带一份 `cjAst` 副本（缺 `Text` 字符串导出名那一格，是第二份真相）；收编之后
// 这里只剩本门自己的语料发现与三栏比较，任何投影字段的修正都只改 `ast-compare.mjs` 一处。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  createAstCore,
  cjAst,
  flatten,
  groupByKind,
  FIELD_NAMES,
  fieldOf,
} from "./ast-compare.mjs";
// **清单与天花板与 wide-ast 共用一份**（D7 波）：两处各抄一份清单就会漂，而漂了的症状
// 正是「白名单悄悄多一条」。这个模块只导出常量与两个纯函数，不读文件、不碰产物。
import {
  expectedCrashList,
  policyOf,
  unexpectedCrashes,
} from "../../tests/parse/incremental-crash-expected.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js"));
// **档位**：默认什么都不写（读产品默认值）；`--legacy` 在 Parse 第一次被调用之前把两个开关压回 false。
const { StatementRouteUtil } = require(
  path.join(root, "build", "ts", "typescript", "tokens", "statements", "statement-route-util.js"),
);
const legacy = process.argv.includes("--legacy");
if (legacy) {
  StatementRouteUtil.EnableIncrementalShapes = false;
  StatementRouteUtil.EnableIncrementalVariableShapes = false;
}
const incrementalOn =
  StatementRouteUtil.EnableIncrementalShapes === true || StatementRouteUtil.EnableIncrementalVariableShapes === true;
const {
  crashCeiling: CRASH_CEILING,
  diffCeiling: DIFF_CEILING,
} = policyOf(incrementalOn);

// 与 ast-json.mjs 的 tsAst / cjAst 同口径（唯一实现见 ast-compare.mjs）。
const { tsAst } = createAstCore(ts);

function collectFiles() {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith(".d.ts")) files.push(full);
    }
  };
  walk(path.join(root, "node_modules", "typescript", "lib"));
  walk(path.join(root, "node_modules", "@types", "node"));
  walk(path.join(root, "node_modules", "undici-types"));
  return files;
}

function diffOne(file, src) {
  const fileNode = ts.createSourceFile(path.basename(file), src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (fileNode.parseDiagnostics || []).length;
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
    return { error: message.split("\n")[0] || "unknown" };
  }
  const theirs = flatten(fileNode.statements.map(tsAst));
  const ours = flatten(rootShape.Data.map(cjAst));
  const theirKinds = groupByKind(theirs);
  const ourKinds = groupByKind(ours);
  const structural = [];
  for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
    const delta = (ourKinds.get(kind)?.length || 0) - (theirKinds.get(kind)?.length || 0);
    if (delta !== 0) structural.push(`${kind}${delta > 0 ? "+" : ""}${delta}`);
  }
  const moved = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let index = 0; index < theirList.length; index++) {
      if (theirList[index].pos !== ourList[index].pos || theirList[index].end !== ourList[index].end) {
        moved.push(`${kind}[${index}] ${theirList[index].pos}-${theirList[index].end} vs ${ourList[index].pos}-${ourList[index].end}`);
      }
    }
  }
  const fields = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let index = 0; index < theirList.length; index++) {
      for (const name of FIELD_NAMES) {
        const a = fieldOf(theirList[index], name);
        const b = fieldOf(ourList[index], name);
        if (String(a) !== String(b)) fields.push(`${kind}[${index}].${name} ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
    }
  }
  return { structural, moved, fields };
}

const verbose = process.argv.includes("--verbose");
const files = collectFiles();
let identical = 0;
let crashed = 0;
let diffed = 0;
let skipped = 0;
const crashLabels = [];
const failures = [];
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const result = diffOne(file, src);
  const label = path.relative(root, file);
  if (result.skipped) {
    skipped++;
    continue;
  }
  if (result.error) {
    crashed++;
    // 与 wide-ast 同一种写法：相对仓库根、正斜杠 —— 清单里的字符串必须能逐字比。
    crashLabels.push(label.replace(/\\/g, "/"));
    continue;
  }
  if (result.structural.length === 0 && result.moved.length === 0 && result.fields.length === 0) {
    identical++;
    continue;
  }
  diffed++;
  failures.push(
    `${label}  structural=${result.structural.length} moved=${result.moved.length} fields=${result.fields.length}`,
  );
}

// **判据（D7 波）**：崩溃集合必须**逐字**等于那一档允许的集合（legacy = 空集），差异不得超过天花板。
// 这两条就是本门的全部判据 —— 与 wide-ast 的 `policyProblems` 同一套口径、同一份清单来源。
const unexpected = unexpectedCrashes(crashLabels, incrementalOn);
const problems = [];
if (crashed > CRASH_CEILING) problems.push(`崩溃 ${crashed} > 天花板 ${CRASH_CEILING}`);
if (unexpected.length > 0) {
  problems.push(`${unexpected.length} 条崩溃不在预期清单里：${unexpected.slice(0, 5).join("、")}`);
}
if (diffed > DIFF_CEILING) problems.push(`有差异 ${diffed} > 天花板 ${DIFF_CEILING}`);

console.log(
  `real-dts（${incrementalOn ? "incremental" : "legacy"} 档）: 文件 ${files.length}（跳过 TS 非法 ${skipped}）：` +
    `解析成功 ${files.length - skipped - crashed}、崩溃 ${crashed}/${CRASH_CEILING}；` +
    `AST 完全一致 ${identical}、有差异 ${diffed}/${DIFF_CEILING}`,
);
if (incrementalOn) {
  console.log(`预期崩溃清单（只许减，与 wide-ast 同源）：${expectedCrashList()}`);
}
if (failures.length > 0) {
  console.log("差异清单（--verbose 才逐条展开差异）：");
  for (const line of failures.slice(0, verbose ? failures.length : 20)) console.log(`  ${line}`);
  if (!verbose && failures.length > 20) console.log(`  （另有 ${failures.length - 20} 处）`);
}
if (problems.length > 0) {
  console.log(`FAIL real-dts：${problems.length} 条`);
  for (const problem of problems) console.log(`  ${problem}`);
  process.exit(1);
}
console.log(
  `PASS real-dts（${incrementalOn ? "incremental" : "legacy"} 档）：崩溃 ${crashed}/${CRASH_CEILING}` +
    (incrementalOn ? `（全在预期清单：${expectedCrashList()}）` : "") +
    `、差异 ${diffed}/${DIFF_CEILING}、缺 range 0（形状层由 wide-ast 的地基栏兜）`,
);
process.exit(0);
