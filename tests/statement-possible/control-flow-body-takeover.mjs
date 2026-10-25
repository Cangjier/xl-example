// Stage 4n takeover proof（控制流体块接管）：
//
//   node tests/statement-possible/control-flow-body-takeover.mjs
//
// 补丁的三步落点（见 HANDOFF-s4n.md §2）：
//   1. StatementShape.OnBracketCreatedEvent → BlockPossibleShape.OnShellBracketCreated（core Bracket.Transit 的第二条回调）；
//   2. BlockPossibleShape.TryMountControlFlowBody（判据：壳 Kind == ShellStatementFamily + 首代码单元是 if/while/do/for/with/try
//      + `{` 处在体位置）；
//   3. StatementRouteUtil.ControlFlowBodyBraceCount（只增计数，证据）。
//
// 对每个源码断言：
//   1. 出厂默认确实是 EnableShellExpressions / EnableBlockBodyCatalog / EnableControlFlowShell / EnableControlFlowEmpty；
//   2. 接管档解析不抛错、不触发文件级 fallback；
//   3. ControlFlowBodyBraceCount 的增量为期望值（体括号确实挂上了目录）；
//   4. BlockBodyStatementCount 的增量（体里的语句确实被块体目录接管）；
//   5. ControlFlowShellCount 的增量（控制流壳照旧）；
//   6. 接管档 XML == legacy 档（EnableShellExpressions=false）XML 逐字节；
//   7. 接管档 AST 与 ts.createSourceFile 逐节点一致；
//   8. 同一源码两次接管档解析 XML 逐字节相同（确定性）；
//   9. XML 里没有 StatementShape / PossibleShape / CatalogGuide 泄漏。
//
// 期望值为 null 表示「这一项不断言」（挂载计数与语句接管数在不同嵌套形态下不必逐条定死，
// 但每条必须落在 HANDOFF-s4n.md §3 记录的读数上）。
//
// 退出码：任一断言失败 → 1。
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

// brace = 期望的 ControlFlowBodyBraceCount 增量；body = 期望的 BlockBodyStatementCount 增量；
// cf = 期望的 ControlFlowShellCount 增量。null = 不断言。
const cases = [
  // —— 八条控制流体：体括号挂目录，体里的语句被块体目录接管 ——
  { source: "if (a) { let x = 1; }", brace: 1, body: 1, cf: 1 },
  { source: "if (a) { b; } else { c; }", brace: 2, body: 2, cf: 1 },
  { source: "while (a) { b; }", brace: 1, body: 1, cf: 1 },
  { source: "do { b; } while (a);", brace: 1, body: 1, cf: 1 },
  { source: "for (;;) { c; }", brace: 1, body: 1, cf: 1 },
  { source: "for (const v of y) { d; }", brace: 1, body: 1, cf: 1 },
  { source: "for (const k in y) { d; }", brace: 1, body: 1, cf: 1 },
  { source: "try { d; } catch (e) { e; } finally { f; }", brace: 3, body: 3, cf: 1 },
  { source: "try { d; } finally { f; }", brace: 2, body: 2, cf: 1 },
  { source: "with (a) { b; }", brace: 1, body: 1, cf: 1 },
  // —— 体的内容：空体 / 表达式 / 声明族 / 注释 ——
  { source: "if (a) {}", brace: 1, body: 0, cf: 1 },
  { source: "if (a) { b + c; d = 1; }", brace: 1, body: 2, cf: 1 },
  { source: "if (a) { var v = 1; const c = 2; }", brace: 1, body: 2, cf: 1 },
  { source: "if (a) { /*c*/ let x = 1; }", brace: 1, body: 1, cf: 1 },
  // —— 嵌套：体内再出现块 / 控制流体 / 函数体 / 外层块 ——
  { source: "if (a) { { let y = 1; } }", brace: 1, body: null, cf: null },
  { source: "if (a) { while (b) { c; } }", brace: 2, body: null, cf: null },
  { source: "try { if (x) { y; } } catch (e) { z; }", brace: 3, body: null, cf: null },
  { source: "if (a) { if (b) { if (c) { d; } } }", brace: 3, body: null, cf: null },
  { source: "if (a) { b; } else if (c) { d; } else { e; }", brace: 3, body: null, cf: null },
  { source: "function f() { if (a) { let x = 1; } }", brace: 1, body: 2, cf: 1 },
  { source: "{ if (a) { let x = 1; } }", brace: 1, body: null, cf: null },
  { source: "async function f() { if (a) { await g(); } }", brace: 1, body: null, cf: null },
  // —— Stage 4p：switch case 体「尝试 → 安全回退」的证据组 ——
  // 挂 case 体的 `{` 会让 `case <表达式>:` 的建树抛 `SourceRange is not set`（`default:` 不抛），
  // 整条文件因此走文件级 fallback。开关 `EnableSwitchCaseBody` 默认关，下面四条钉住「不接管」：
  // switch 的体括号与 case 体的 `{` 都不挂目录（brace 0），体内语句留 raw（body 0），只有 switch 壳（cf 1）。
  { source: "switch (x) { case 1: { let y = 1; } }", brace: 0, body: 1, cf: 1 },
  { source: "switch (x) { case 1: f(); case 2: { g(); } break; }", brace: 0, body: 1, cf: 1 },
  { source: "switch (x) { default: { let y = 2; } }", brace: 0, body: 1, cf: 1 },
  { source: "switch (x) { case 1: { if (a) { b; } } }", brace: 1, body: null, cf: 2 },
  // —— 对照 / 冒名组：必须**不挂**（安全回退，brace 与 body 均为 0）——
  { source: "if (a) b;", brace: 0, body: 0, cf: 1 },
  { source: "if (a) b\n{}", brace: 0, body: 0, cf: null },
  { source: "({ m() { let z = 1; } });", brace: 0, body: 1, cf: null },
  { source: "const f = x => { let z = 1; };", brace: 0, body: 1, cf: null },
  // Stage 4p：块内函数声明的体**挂上了目录但没有被收集**（mount 1、body 0）——挂载不等于接管，
  // switch case 体在 `EnableSwitchCaseBody = false` 下**不接管**（见上面的 4p 证据组）。
  { source: "{ function f() { let x = 1; } }", brace: 0, body: 1, cf: 0 },
  { source: "{ function f() { let x = 1; } f(); }", brace: 0, body: 1, cf: 0 },
  { source: "{ function g() { a; b; } }", brace: 0, body: 2, cf: 0 },
  { source: "{ function h(): void { g(); } }", brace: 0, body: 1, cf: 0 },
  // Stage 4w: the generic type-parameter list is a run of flat Symbol units (< T >) in the host Data,
  // not a Bracket; the body predicate now skips it, so the body brace mounts and collects.
  { source: "{ function f<T>(a: T) { let x = a; } }", brace: 0, body: 1, cf: 0 },
  { source: "{ function g<T>(){ a; b; } }", brace: 0, body: 2, cf: 0 },
  { source: "{ function h<T extends A<B>>(x: T) { let y = x; } }", brace: 0, body: 1, cf: 0 },
  { source: "{ function k<T>(): { a: T } { return null; } }", brace: 0, body: 1, cf: 1 },
  // Stage 4w: block-level declarations stay raw at the default gates (declaration family shell is off);
  // XML/AST are still gate-checked for every case, so these prove the new registration is inert.
  // Stage 4ae: EnableBlockClassShell ships true, so the block-level class shell is taken over:
  // the class statement itself is collected (body +1) and it is a ShellStatementFamily shell (cf +1).
  { source: "{ class C {} }", brace: 0, body: 1, cf: 1 },
  { source: "{ enum E { A } }", brace: 0, body: 0, cf: 0 },
  { source: "{ declare const x: number; }", brace: 0, body: 0, cf: 0 },
  // +1 for the class statement itself, +1 for `let y = 1;` collected inside the method body.
  { source: "{ class C { m(){ let y = 1; } } }", brace: 0, body: 2, cf: 1 },
  // no false positive: object-literal generic method body must NOT mount (host is the object literal, not a block).
  { source: "const o = { m<T>(a: T){ let z = a; } };", brace: 0, body: 1, cf: null },
  { source: "switch (x) { case a + 1: { g(); } }", brace: 0, body: 1, cf: 1 },
  { source: "switch (x) { case foo(): { g(); } }", brace: 0, body: 1, cf: 1 },
  { source: "switch (x) { case a ? b : c: { g(); } }", brace: 0, body: 1, cf: 1 },

];

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

function parse(source) {
  return SourceFileRunner.Parse(source, "case.ts");
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

function xmlDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return `第 ${index} 个字符起不同`;
  }
  if (left.length !== right.length) return `长度不同：${left.length} / ${right.length}`;
  return null;
}

const failures = [];
const defaultFlags = R.EnableShellExpressions === true
  && R.EnableBlockBodyCatalog === true
  && R.EnableControlFlowShell === true
  && R.EnableControlFlowEmpty === true
  && typeof R.ControlFlowBodyBraceCount === "number";
if (!defaultFlags) {
  failures.push("出厂默认 EnableShellExpressions / EnableBlockBodyCatalog / EnableControlFlowShell / EnableControlFlowEmpty 不都是 true，或 ControlFlowBodyBraceCount 不存在");
}

let totalBrace = 0;
let totalBody = 0;

for (const item of cases) {
  const problems = [];
  R.EnableShellExpressions = false;
  let legacyXml = null;
  try {
    legacyXml = parse(item.source).ToXmlString();
  } catch (error) {
    problems.push(`legacy 抛错：${describeError(error)}`);
  }

  R.EnableShellExpressions = true;
  const before = {
    brace: R.ControlFlowBodyBraceCount,
    cf: R.ControlFlowShellCount,
    body: R.BlockBodyStatementCount,
    fallback: R.FileFallbackCount,
  };
  let shape = null;
  try {
    shape = parse(item.source);
  } catch (error) {
    problems.push(`接管档抛错：${describeError(error)}`);
  }
  const braceDelta = R.ControlFlowBodyBraceCount - before.brace;
  const cfDelta = R.ControlFlowShellCount - before.cf;
  const bodyDelta = R.BlockBodyStatementCount - before.body;
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  totalBrace += braceDelta;
  totalBody += bodyDelta;

  if (shape !== null) {
    const xml = shape.ToXmlString();
    if (legacyXml !== null) {
      const diff = xmlDifference(xml, legacyXml);
      if (diff !== null) problems.push(`XML != legacy：${diff}`);
    }
    for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
      if (xml.includes(`<${tag}>`)) problems.push(`形状树泄漏 <${tag}>`);
    }
    const file = ts.createSourceFile("case.ts", item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
    if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
    const again = parse(item.source).ToXmlString();
    const determinism = xmlDifference(xml, again);
    if (determinism !== null) problems.push(`XML 非确定：${determinism}`);
  }
  if (fallback) problems.push("触发了文件级 fallback（接管档不应需要兜底）");
  if (item.brace !== null && braceDelta !== item.brace) {
    problems.push(`ControlFlowBodyBraceCount 增量=${braceDelta} 期望=${item.brace}`);
  }
  if (item.body !== null && bodyDelta !== item.body) {
    problems.push(`BlockBodyStatementCount 增量=${bodyDelta} 期望=${item.body}`);
  }
  if (item.cf !== null && cfDelta !== item.cf) {
    problems.push(`ControlFlowShellCount 增量=${cfDelta} 期望=${item.cf}`);
  }

  const shown = JSON.stringify(item.source.length > 60 ? `${item.source.slice(0, 60)}…` : item.source);
  if (problems.length > 0) {
    failures.push(`${shown}: ${problems.join(" | ")}`);
    console.log(`FAIL ${shown}`);
    for (const problem of problems) console.log(`   ! ${problem}`);
  } else {
    console.log(`PASS ${shown}  brace=${braceDelta} body=${bodyDelta} cf=${cfDelta}`);
  }
}

console.log(`\n[control-flow-body-takeover] cases=${cases.length} failed=${failures.length} defaultFlags=${defaultFlags} totalBrace=${totalBrace} totalBody=${totalBody}`);
process.exit(failures.length === 0 ? 0 : 1);
