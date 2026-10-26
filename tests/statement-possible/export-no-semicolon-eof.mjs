// 族 A 专用探针（Stage 4af-a）：**末单元是闭合 `{…}` / 字符串、且文件在此结束、没有 `;`** 的
// 声明 / 导入导出语句。默认态与打开态都必须建出正确节点，不许退 raw、不许文件级 fallback。
//
//   node tests/statement-possible/export-no-semicolon-eof.mjs            # 默认态
//   node tests/statement-possible/export-no-semicolon-eof.mjs --open     # 打开态（EnableDeclarationShell=true）
//
// 断言的四个面（与 declaration-statement-takeover.mjs 同口径）：
//   1. AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）；
//   2. 打开态 XML 逐字节 == legacy（EnableShellExpressions=false）——壳不改变形状树；
//   3. 打开态不触发文件级 fallback；声明壳接管次数 == 用例声明值（默认态 == 0）；
//   4. 打开态 DeclarationShellCount 增量大于 0 才算「真的接管过了」。
//
// 覆盖族 A 的 8 种收尾形态 + 2 条带 `;` 的对照（`;` 本来就正常，防回归）
// + 族 B 的「闭合 `{…}` 后接下一句」（Stage 4af-B 修好，Stage 4af-D 转为正式期望）
// + Stage 4af-D 的两条 undici 收尾形态（`export {…}` ⏎ `export default`、`: void` 签名 + export 列表）。
// 退出码：失败 > 0 → 1。
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst, flatten, kindOf } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const load = (p) => require(path.join(root, "build/ts", p));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");

const modeOpen = process.argv.includes("--open");

// declarationShells：打开态该用例的声明壳接管次数；默认态一律 0。
const CASES = [
  { name: "export-named-eof", source: "export { a }", declarationShells: 1 },
  { name: "export-named-eof-nl", source: "export { a }\n", declarationShells: 1 },
  { name: "export-alias-eof", source: "export { a as b }", declarationShells: 1 },
  { name: "import-side-effect-eof", source: "import \"m\"", declarationShells: 1 },
  { name: "export-type-eof", source: "export type { B }", declarationShells: 1 },
  { name: "export-string-name-eof", source: "export { \"a-b\" as c, \"d\" }", declarationShells: 1 },
  { name: "export-specifier-comment-eof", source: "export { a /*1*/ as /*2*/ b, c }", declarationShells: 1 },
  { name: "export-type-alias-eof", source: "export type { B as C }", declarationShells: 1 },
  // 对照：带 `;` 的两条在打开态本来就走 `;` 收口，不许被本次改动带坏。
  { name: "control-export-semicolon", source: "export { a };", declarationShells: 1 },
  { name: "control-import-semicolon", source: "import \"m\";", declarationShells: 1 },
  // 对照：闭合 `{…}` 后还有下一条语句。Stage 4af-B 之后按普通单词起点收口（判据二 / 三），
  // Stage 4af-D 起转为**正式期望**：不再允许退回「吞下一句 + 文件级 fallback」。
  { name: "control-next-statement", source: "export { a }\nfoo();", declarationShells: 1 },
  // Stage 4af-D：无分号 `export { … }` 后随 `export default`（undici-types/index.d.ts 的收尾形态）。
  { name: "export-list-then-export-default", source: "export { a }\nexport default b", declarationShells: 2 },
  // Stage 4af-D：`: void` 收尾的 ambient 签名 + 无分号 export 列表 + `export default` 同文件组合。
  {
    name: "declare-void-then-export-list",
    source: "declare function f (): void\n\nexport { A, B }\nexport default U\n",
    declarationShells: 3,
  },
];

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

function firstDifference(tsNodes, cjNodes) {
  const tsFlat = flatten(tsNodes);
  const cjFlat = flatten(cjNodes);
  const count = Math.min(tsFlat.length, cjFlat.length);
  for (let index = 0; index < count; index++) {
    const left = tsFlat[index];
    const right = cjFlat[index];
    if (kindOf(left.kind) !== kindOf(right.kind)) {
      return `#${index} kind: TS=${kindOf(left.kind)} CJ=${kindOf(right.kind)}`;
    }
    if (left.pos !== right.pos || left.end !== right.end) {
      return `#${index} ${kindOf(left.kind)} range: TS=[${left.pos},${left.end}) CJ=[${right.pos},${right.end})`;
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        return `#${index} ${kindOf(left.kind)} ${field}: TS=${JSON.stringify(left[field])} CJ=${JSON.stringify(right[field])}`;
      }
    }
  }
  if (tsFlat.length !== cjFlat.length) {
    return `节点数：TS=${tsFlat.length} CJ=${cjFlat.length}`;
  }
  return null;
}

function astLineDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return `第 ${index} 个字符起不同`;
  }
  if (left.length !== right.length) return `长度不同：${left.length} / ${right.length}`;
  return null;
}

const failures = [];
let passCases = 0;
let knownGaps = 0;
let totalShell = 0;
let takeoverCases = 0;

for (const item of CASES) {
  const problems = [];

  // legacy 基线：两条开关都关，走纯 legacy。
  R.EnableShellExpressions = false;
  R.EnableDeclarationShell = false;
  let legacyAstLine = null;
  try {
    legacyAstLine = SourceFileRunner.Parse(item.source, "case.ts").ToAstLine(0);
  } catch (error) {
    problems.push(`legacy 抛错：${describeError(error)}`);
  }

  // 被测档：默认态（只开 shell 表达式）或打开态（再加声明壳）。
  R.EnableShellExpressions = true;
  R.EnableDeclarationShell = modeOpen;
  const before = { shell: R.DeclarationShellCount, fallback: R.FileFallbackCount };
  let shape = null;
  try {
    shape = SourceFileRunner.Parse(item.source, "case.ts");
  } catch (error) {
    problems.push(`${modeOpen ? "打开态" : "默认态"}抛错：${describeError(error)}`);
  }
  const shellDelta = R.DeclarationShellCount - before.shell;
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  totalShell += shellDelta;
  if (shellDelta > 0) takeoverCases += 1;

  const expectedShells = modeOpen ? item.declarationShells : 0;
  if (shellDelta !== expectedShells) {
    problems.push(`DeclarationShellCount 增量=${shellDelta} 期望=${expectedShells}`);
  }

  if (shape !== null) {
    const xml = shape.ToAstLine(0);
    if (legacyAstLine !== null) {
      const diff = astLineDifference(xml, legacyAstLine);
      if (diff !== null) problems.push(`XML != legacy：${diff}`);
    }
    for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
      if (xml.includes(`${tag}  `)) problems.push(`形状树泄漏 <${tag}>`);
    }
    const file = ts.createSourceFile("case.ts", item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
    if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
  }
  if (fallback) problems.push("触发了文件级 fallback");

  const knownGap = modeOpen && typeof item.knownGap === "string";
  if (problems.length === 0) {
    passCases += 1;
    if (modeOpen) console.log(`PASS ${item.name}  decl=${shellDelta}`);
  } else if (knownGap) {
    knownGaps += 1;
    console.log(`KNOWN-GAP ${item.name}  ${JSON.stringify(item.source)} — ${item.knownGap}`);
    for (const problem of problems) console.log(`     - ${problem}`);
  } else {
    failures.push(item.name);
    console.log(`FAIL ${item.name}  ${JSON.stringify(item.source)}`);
    for (const problem of problems) console.log(`     - ${problem}`);
  }
}

const mode = modeOpen ? "open" : "default";
console.log(`[export-no-semicolon-eof] mode=${mode} cases=${CASES.length} pass=${passCases} failed=${failures.length} knownGap=${knownGaps} takeover=${takeoverCases} totalShell=${totalShell}`);
process.exit(failures.length > 0 ? 1 : 0);
