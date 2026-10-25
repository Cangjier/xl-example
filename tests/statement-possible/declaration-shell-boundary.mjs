// Stage 5d-3：根层 `function` / `class` / 装饰器声明的语句壳 —— 判界与接管证据探针。
//
//   node tests/statement-possible/declaration-shell-boundary.mjs
//   node tests/statement-possible/declaration-shell-boundary.mjs --json     # 机器可读
//   node tests/statement-possible/declaration-shell-boundary.mjs --verbose  # 每条都打印计数器读数
//
// 每条用例断言六件事（全部有读数，没有一条是「结构上应该对」）：
//   1. 默认档（`EnableRootDeclarationShell` / `EnableShellExpressions` 为 true）解析不抛错、不触发文件级 fallback；
//   2. XML 与 legacy 档（`EnableShellExpressions = false`）**逐字节相同**；
//   3. AST 与 `ts.createSourceFile(...).statements` **逐节点相同**（kind / pos / end / text / name / isTypeOnly）；
//   4. 族壳计数器增量与用例声明的一致（`fn` / `cls` / `dec` 三个字段，缺省 0）；
//   5. **族作用域 ScanRoot = 0**：本次解析里，任何一次 `StatementScanner.ScanRoot` 的调用，只要它的
//      code 首单元属于本族（`function` / `class` / `@`，或 `async`+`function` / `abstract`+`class`），
//      都算违约；`async` / `abstract` 的**首格**（code 只有这一个单元）也单独计数并断言 0
//      ——那正是 Stage 5d-3 的文档级前瞻要消掉的那一次调用；
//   6. **legacy 根候选零接管**：`FunctionDeclarationPossibleShape` / `ClassDeclarationPossibleShape` 的
//      `BuildByIndex` 在默认档一次都没被调用（这两族以前正是由它们在根目录里原子建的）。
//
// 反事实敏感性（`--counterfactual`，默认也跑，结果打印在 summary 里）：把 `EnableRootDeclarationShell`
// 临时关掉再解析同一份源码，legacy 根候选必须**至少被调用一次**（`migrated: true` 的用例）。否则上面
// 第 6 条「0 次」就可能只是探针没插上，而不是真的迁走了。
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
const { StatementScanner } = load("typescript/tokens/statements/statement-scanner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementRoute } = load("typescript/tokens/statements/statement-route-util.js");
const { FunctionDeclarationPossibleShape } = load("typescript/tokens/declarations/function-declaration-possible-shape.js");
const { ClassDeclarationPossibleShape } = load("typescript/tokens/declarations/class-declaration-possible-shape.js");

const args = { json: false, verbose: false };
for (const arg of process.argv.slice(2)) {
  if (arg === "--json") args.json = true;
  else if (arg === "--verbose") args.verbose = true;
  else {
    console.log(`不认识的选项：${arg}`);
    process.exit(2);
  }
}

// ── 用例表 ────────────────────────────────────────────────────────────────
// fn / cls / dec = 期望的 `FunctionDeclarationShellCount` / `ClassDeclarationShellCount` /
// `DecoratedDeclarationShellCount` 增量；缺省 0（包括 declare / export 档与块内声明：它们**不**由本族接管，
// 如实断言 0，见 HANDOFF-5d3 §未迁清单）。
// **Stage 5d-8a 起块内声明也由本族接管**（`EnableBlockDeclarationShell`）：块内 `function` /
// `abstract class` / `async function` / 装饰器走同一条建壳通道，所以本文件里「块内 function 未迁」的
// 三条用例改成如实断言 `fn: 1`（`keep-*` 改名为 `block-*` 并标 `migrated: true`），
// 而 `fn-nested`（外层 + 块内内层）与 `class-body-method-function`（根 class + 方法体里的 function）
// 的期望增量相应变成 2 条 / 各 1 条。
// migrated: true = 关掉开关时必须回落到 legacy 根候选（反事实敏感性检查）。
// migrated: false 的两种情形：① declare / export / 块内声明——本来就不该由本族接管；
// ② **EOF 末尾的 ambient 签名**（`function f(): void` 无 `;`、`function f(): { a: A }`）与
// `function f(): void` ⏎ `function g(): void` ⏎ `function h() {}` 链：5d-3 之前它们不是由
// `FunctionDeclarationPossibleShape` 建的，而是根终结候选在 EOF 上的 `BuildTrailingDeclaration` 建的，
// 所以「关掉开关后 legacy 根候选被调用几次」这条反事实对它们天然不敏感（不是探针的问题）。
// 这些用例的接管证据改由族壳计数（fn=1 / fn=3）与 XML/AST 断言承担。
const CASES = [
  // ── 根层 function（含 async / 生成器 / 泛型 / 返回类型 / ambient 无体） ──
  { name: "fn-basic", src: "function f() {}", fn: 1, migrated: true },
  { name: "fn-return-type", src: "function f(a: A): B { return a; }", fn: 1, migrated: true },
  { name: "fn-generator", src: "function* g() { yield 1; }", fn: 1, migrated: true },
  { name: "fn-async", src: "async function a() { await g(); }", fn: 1, migrated: true },
  { name: "fn-async-generator", src: "async function* ag() { yield 1; }", fn: 1, migrated: true },
  { name: "fn-generic", src: "function f<T extends A>(x: T): T { return x; }", fn: 1, migrated: true },
  { name: "fn-generic-two", src: "function f<T, U extends T>(a: T, b: U): void {}", fn: 1, migrated: true },
  { name: "fn-generic-angle-close", src: "function f<T extends A<B>>(x: T) {}", fn: 1, migrated: true },
  { name: "fn-return-object-type", src: "function f(): { a: A } { return null; }", fn: 1, migrated: true },
  { name: "fn-ambient-return-object", src: "function f(): { a: A }", fn: 1 },
  { name: "fn-ambient-void-no-semicolon", src: "function f(): void", fn: 1 },
  { name: "fn-overload-signature", src: "function f(a: A): B;", fn: 1, migrated: true },
  { name: "fn-overload-then-impl", src: "function f(): void;\nfunction f() {}", fn: 2, migrated: true },
  { name: "fn-comment-after-keyword", src: "function /*c*/ f() {}", fn: 1, migrated: true },
  { name: "fn-newline-before-name", src: "function\nf() {}", fn: 1, migrated: true },
  { name: "fn-default-arrow-param", src: "function f(a: A = () => { return 1; }) {}", fn: 1, migrated: true },
  { name: "fn-nested", src: "function outer() { function inner() { return 1; } }", fn: 2, migrated: true },
  { name: "fn-body-class", src: "function f() { class C {} }", fn: 1, migrated: true },
  { name: "fn-trailing-comment", src: "function f() {} // done", fn: 1, migrated: true },
  { name: "fn-then-semicolon", src: "function f() {}\n;", fn: 1, migrated: true },

  // ── 根层 class（含泛型 / heritage / abstract / 恢复形 / static 块） ──
  { name: "class-basic", src: "class C {}", cls: 1, migrated: true },
  { name: "class-method", src: "class C { m() { return 1; } }", cls: 1, migrated: true },
  { name: "class-fields", src: "class C { a = 1; static b = 2; }", cls: 1, migrated: true },
  { name: "class-generic-object-constraint", src: "class C<T extends {}> { m() {} }", cls: 1, migrated: true },
  { name: "class-generic", src: "class C<T> extends B {}", cls: 1, migrated: true },
  { name: "class-heritage", src: "class C extends A<B> implements I, J {}", cls: 1, migrated: true },
  { name: "class-abstract", src: "abstract class A { abstract m(): void; }", cls: 1, migrated: true },
  { name: "class-abstract-generic", src: "abstract class A<T> extends B { m() {} }", cls: 1, migrated: true },
  { name: "class-recovery-no-name", src: "class {}", cls: 1, migrated: true },
  { name: "class-recovery-type-params", src: "class<T> {}", cls: 1, migrated: true },
  { name: "class-recovery-type-params-extends", src: "class<T> extends B {}", cls: 1, migrated: true },
  { name: "class-static-block", src: "class C { static { let x = 1; } }", cls: 1, migrated: true },
  { name: "class-newline-body", src: "class C\n{}", cls: 1, migrated: true },
  { name: "class-comment-head", src: "class /*c*/ C {}", cls: 1, migrated: true },
  { name: "class-body-method-function", src: "class C { m() { function f() {} } }", cls: 1, fn: 1, migrated: true },

  // ── 根层装饰器声明（判型交给 BuildDecoratedStatement 的同一个 ScanDecoratedHead） ──
  { name: "dec-class", src: "@dec class C { }", dec: 1, migrated: true },
  { name: "dec-function", src: "@dec function f() { }", dec: 1, migrated: true },
  { name: "dec-multi", src: "@a @b class C { }", dec: 1, migrated: true },
  { name: "dec-qualified-call", src: "@ns.dec(1) class C {}", dec: 1, migrated: true },
  { name: "dec-object-argument", src: "@dec({ a: 1 }) class C {}", dec: 1, migrated: true },
  { name: "dec-newline-before-class", src: "@dec\nclass C {}", dec: 1, migrated: true },
  { name: "dec-comment-before-class", src: "@dec /*c*/ class C {}", dec: 1, migrated: true },
  { name: "dec-abstract-class", src: "@dec abstract class A {}", dec: 1, migrated: true },
  { name: "dec-async-function", src: "@dec async function f() { await g(); }", dec: 1, migrated: true },
  { name: "dec-generic-class", src: "@dec class C<T> extends B {}", dec: 1, migrated: true },
  // 装饰器族壳也接非 class/function 的声明：判型仍由 `BuildDecoratedStatement` 的同一个 ScanDecoratedHead
  // 分派（本族只负责建壳 / 收口），所以这里断言「壳建了、树仍等于 legacy」。
  { name: "dec-interface", src: "@dec interface I { }", dec: 1 },
  { name: "dec-enum", src: "@dec enum E { A }", dec: 1 },
  { name: "dec-namespace", src: "@dec namespace N { export const a = 1; }", dec: 1 },
  { name: "dec-type-alias", src: "@dec type T = A;", dec: 1 },

  // ── 相邻语句 / ASI / 多语句组合（判界不能把下一条吞进壳，也不能提前切） ──
  { name: "mix-fn-class-var", src: "function f() {}\nclass C {}\nlet x = 1;", fn: 1, cls: 1, migrated: true },
  { name: "mix-var-fn", src: "const a = 1;\nfunction f() {}", fn: 1, migrated: true },
  { name: "mix-type-fn", src: "type T = A\nfunction f() {}", fn: 1, migrated: true },
  { name: "mix-interface-class", src: "interface I {}\nclass C {}", cls: 1, migrated: true },
  { name: "mix-enum-fn", src: "enum E { A }\nfunction f() {}", fn: 1, migrated: true },
  { name: "mix-fn-dec-class", src: "function f() {}\n@dec class C {}", fn: 1, dec: 1, migrated: true },
  { name: "mix-dec-class-fn", src: "@dec class C {}\nfunction f() {}", fn: 1, dec: 1, migrated: true },
  { name: "mix-class-const", src: "class C {}\nconst a = 1;", cls: 1, migrated: true },
  { name: "mix-class-array", src: "class C {}\n[1, 2].forEach(f);", cls: 1, migrated: true },
  { name: "mix-fn-paren", src: "function f() {}\n(a);", fn: 1, migrated: true },
  { name: "mix-class-semicolon-class", src: "class C {};\nclass D {}", cls: 2, migrated: true },
  { name: "mix-overload-chain", src: "function f(): void\nfunction g(): void\nfunction h() {}", fn: 3 },
  { name: "mix-fn-interface", src: "function f() {}\ninterface I {}", fn: 1, migrated: true },

  // ── 未迁：declare / export（仍由声明族壳接管，本族计数必须为 0） ──
  { name: "keep-declare-function", src: "declare function df(): void;" },
  { name: "keep-declare-function-no-semicolon", src: "declare function df(): void" },
  { name: "keep-declare-class", src: "declare class D { m(): void; }" },
  { name: "keep-declare-abstract-class", src: "declare abstract class DA { m(): void; }" },
  { name: "keep-declare-async-function", src: "declare async function daf(): void;" },
  { name: "keep-export-function", src: "export function ef(): void {}" },
  { name: "keep-export-class", src: "export class EC {}" },
  { name: "keep-export-default-class", src: "export default class {}" },
  { name: "keep-export-default-function", src: "export default function () {}" },

  // ── 块内 function / if 体 function（Stage 5d-8a 起由本族接管，**已迁**） ──
  // 块体目录里现在挂着 `ControlFlowStatementPossibleShape`，而它认 `ShellFunctionDeclaration`，
  // 所以 `{ function f() {} }` / `if (a) { function f() {} }` 与根层走同一条建壳 / 收口 / 建树通道。
  // **`migrated: false` 是刻意的**：本文件的 `migrated` 检查的是「关掉开关后 **legacy 根候选**
  // （`FunctionDeclarationPossibleShape` / `ClassDeclarationPossibleShape`）是否被调用」，而这两条
  // 关掉开关后的回退是**块体 raw 循环**（`BuildBlock` → `BuildStatement`），根候选根本不参与——
  // 那条回退由 `raw-tail-attribution.mjs` 的 raw 计数与本文件的 XML/AST 逐字节断言覆盖。
  { name: "block-function", src: "{ function f() { let x = 1; } }", fn: 1 },
  { name: "if-body-function", src: "if (a) { function f() {} }", fn: 1 },

  // ── 仍未迁：块内 `class`（由 4ae 的 `EnableBlockClassShell` 判成 `ShellStatementFamily`，
  //    走 `ScanRoot` + 体括号收口；不归本族，所以 `cls` 增量如实断言 0） ──
  { name: "keep-block-class", src: "{ class C { m() {} } }" },
];

const FAMILY_HEADS = new Set(["function", "class", "@"]);

function headTextOf(unit) {
  if (unit === null || unit === undefined) return "";
  if (typeof unit.TempToString === "function") return unit.TempToString();
  return "";
}

// 族作用域归因：**只算根层的调用**（首单元的 `Parent` 是 `SourceFileShape`）。
// 块内的 `class` 语句壳（gap-SW 的 `ShellStatementFamily`）照样每格问 `ScanRoot`，那不在本阶段范围，
// 它的 code 首单元 `Parent` 是块级语句壳（`StatementShape`），这里排除掉——否则会把「块内 class 未迁」
// 误记成「根层 class 族还有 ScanRoot」。
function isRootOwned(unit) {
  const owner = unit === null || unit === undefined ? null : unit.Parent;
  return owner !== null && owner !== undefined && owner.constructor?.name === "SourceFileShape";
}

function familyScanRootCall(code) {
  if (!Array.isArray(code) || code.length === 0) return false;
  if (!isRootOwned(code[0])) return false;
  const first = headTextOf(code[0]);
  if (FAMILY_HEADS.has(first)) return true;
  if ((first === "async" || first === "abstract") && code.length > 1) {
    const second = headTextOf(code[1]);
    if ((first === "async" && second === "function") || (first === "abstract" && second === "class")) {
      return true;
    }
  }
  return false;
}

function firstColumnAsyncOrAbstract(code, rootOwned) {
  return rootOwned && Array.isArray(code) && code.length === 1
    && (headTextOf(code[0]) === "async" || headTextOf(code[0]) === "abstract");
}

// ── 探测器：ScanRoot 归因 + legacy 根候选接管计数 ───────────────────────────
let familyCalls = [];
let firstColumnCalls = 0;
const originalScanRoot = StatementScanner.ScanRoot;
StatementScanner.ScanRoot = function (code) {
  const rootOwned = Array.isArray(code) && code.length > 0 && isRootOwned(code[0]);
  if (familyScanRootCall(code)) {
    familyCalls.push(code.slice(0, 6).map((unit) => headTextOf(unit) || unit.constructor?.name).join(" "));
  }
  if (firstColumnAsyncOrAbstract(code, rootOwned)) {
    firstColumnCalls += 1;
  }
  return originalScanRoot.call(StatementScanner, code);
};

let legacyRootBuilds = 0;
for (const shapeClass of [FunctionDeclarationPossibleShape, ClassDeclarationPossibleShape]) {
  const original = shapeClass.prototype.BuildByIndex;
  shapeClass.prototype.BuildByIndex = function (...callArgs) {
    legacyRootBuilds += 1;
    return original.apply(this, callArgs);
  };
}

// ── 比较工具 ──────────────────────────────────────────────────────────────
function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

function parse(source) {
  return SourceFileRunner.Parse(source, "declaration-shell.ts");
}

function firstDifference(tsNodes, cjNodes) {
  const tsFlat = flatten(tsNodes);
  const cjFlat = flatten(cjNodes);
  const count = Math.min(tsFlat.length, cjFlat.length);
  for (let index = 0; index < count; index++) {
    const left = tsFlat[index];
    const right = cjFlat[index];
    if (kindOf(left.kind) !== kindOf(right.kind)) {
      return `#${index} kind TS=${kindOf(left.kind)} CJ=${kindOf(right.kind)}`;
    }
    if (left.pos !== right.pos || left.end !== right.end) {
      return `#${index} ${kindOf(left.kind)} range TS=[${left.pos},${left.end}) CJ=[${right.pos},${right.end})`;
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        return `#${index} ${kindOf(left.kind)} ${field} TS=${JSON.stringify(left[field])} CJ=${JSON.stringify(right[field])}`;
      }
    }
  }
  if (tsFlat.length !== cjFlat.length) {
    return `节点数 TS=${tsFlat.length} CJ=${cjFlat.length}`;
  }
  return null;
}

// ── 前置不变量 ────────────────────────────────────────────────────────────
const failures = [];
const invariants = [];
if (R.EnableRootDeclarationShell !== true) invariants.push("EnableRootDeclarationShell 默认不是 true");
if (R.EnableShellExpressions !== true) invariants.push("EnableShellExpressions 默认不是 true");
for (const field of ["FunctionDeclarationShellCount", "ClassDeclarationShellCount", "DecoratedDeclarationShellCount"]) {
  if (typeof R[field] !== "number") invariants.push(`${field} 不存在`);
}
for (const route of ["ShellFunctionDeclaration", "ShellClassDeclaration", "ShellDecoratedDeclaration"]) {
  if (typeof StatementRoute[route] !== "number") invariants.push(`StatementRoute.${route} 不存在`);
}
if (invariants.length > 0) {
  failures.push(`基础不变量不成立：${invariants.join("；")}`);
}

const rows = [];
let passCases = 0;
let counterfactualSensitive = 0;
let migratedCases = 0;

for (const item of CASES) {
  const problems = [];

  // 1) legacy 档 XML（壳全关）。
  R.EnableShellExpressions = false;
  let legacyXml = null;
  try {
    legacyXml = parse(item.src).ToXmlString();
  } catch (error) {
    problems.push(`legacy 档抛错：${describeError(error)}`);
  }

  // 2) 默认档。
  R.EnableShellExpressions = true;
  const before = {
    fn: R.FunctionDeclarationShellCount,
    cls: R.ClassDeclarationShellCount,
    dec: R.DecoratedDeclarationShellCount,
    fallback: R.FileFallbackCount,
  };
  familyCalls = [];
  firstColumnCalls = 0;
  legacyRootBuilds = 0;
  let shape = null;
  try {
    shape = parse(item.src);
  } catch (error) {
    problems.push(`默认档抛错：${describeError(error)}`);
  }
  const delta = {
    fn: R.FunctionDeclarationShellCount - before.fn,
    cls: R.ClassDeclarationShellCount - before.cls,
    dec: R.DecoratedDeclarationShellCount - before.dec,
    fallback: R.FileFallbackCount - before.fallback,
    legacyRoot: legacyRootBuilds,
    familyScanRoot: familyCalls.length,
    firstColumn: firstColumnCalls,
  };

  const expectFn = item.fn ?? 0;
  const expectCls = item.cls ?? 0;
  const expectDec = item.dec ?? 0;

  if (delta.fn !== expectFn) problems.push(`FunctionDeclarationShellCount 增量=${delta.fn} 期望=${expectFn}`);
  if (delta.cls !== expectCls) problems.push(`ClassDeclarationShellCount 增量=${delta.cls} 期望=${expectCls}`);
  if (delta.dec !== expectDec) problems.push(`DecoratedDeclarationShellCount 增量=${delta.dec} 期望=${expectDec}`);
  if (delta.familyScanRoot !== 0) {
    problems.push(`族作用域 ScanRoot=${delta.familyScanRoot} 期望=0（${familyCalls.join(" | ")}）`);
  }
  if (delta.firstColumn !== 0) {
    problems.push(`async/abstract 首格 ScanRoot=${delta.firstColumn} 期望=0`);
  }
  if (delta.legacyRoot !== 0) {
    problems.push(`legacy 根候选 BuildByIndex=${delta.legacyRoot} 期望=0`);
  }
  if (delta.fallback !== 0) problems.push(`触发文件级 fallback=${delta.fallback}`);
  if (R.LastFileFallback === true) problems.push("LastFileFallback=true");

  // 3) XML / AST。
  if (shape !== null) {
    if (legacyXml !== null) {
      const xml = shape.ToXmlString();
      if (xml !== legacyXml) {
        let at = 0;
        while (at < Math.min(xml.length, legacyXml.length) && xml[at] === legacyXml[at]) at += 1;
        problems.push(`XML != legacy（第 ${at} 字符起）`);
      }
      for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
        if (xml.includes(`<${tag}>`)) problems.push(`形状树泄漏 <${tag}>`);
      }
    }
    const file = ts.createSourceFile("declaration-shell.ts", item.src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
    if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
  }

  // 4) 反事实敏感性：关掉开关 → legacy 根候选必须被调用（只对 migrated 用例断言）。
  let counterfactual = 0;
  if (item.migrated === true) {
    migratedCases += 1;
    R.EnableRootDeclarationShell = false;
    legacyRootBuilds = 0;
    try {
      parse(item.src);
    } catch {
      // 反事实档只量「有没有回落到 legacy 根候选」；它抛错不影响本用例的接管结论。
    } finally {
      R.EnableRootDeclarationShell = true;
    }
    counterfactual = legacyRootBuilds;
    if (counterfactual > 0) counterfactualSensitive += 1;
    else problems.push("反事实：关掉开关后 legacy 根候选一次都没被调用（探针不可信）");
  }

  const row = {
    name: item.name,
    src: item.src,
    expect: { fn: expectFn, cls: expectCls, dec: expectDec },
    measured: delta,
    counterfactualLegacyRoot: counterfactual,
    problems,
  };
  rows.push(row);

  if (problems.length === 0) {
    passCases += 1;
    if (args.verbose) {
      console.log(`PASS ${item.name}  fn=${delta.fn} cls=${delta.cls} dec=${delta.dec}`
        + ` legacyRoot=${delta.legacyRoot} familyScan=${delta.familyScanRoot}`
        + ` counterfactual=${counterfactual}`);
    }
  } else {
    console.log(`FAIL ${item.name}  ${JSON.stringify(item.src)}`);
    for (const problem of problems) console.log(`   ! ${problem}`);
  }
}

const summary = {
  schema: "declaration-shell-boundary/1",
  cases: CASES.length,
  pass: passCases,
  failed: CASES.length - passCases,
  migratedCases,
  counterfactualSensitive,
  failures,
  rows,
};
console.log(
  `\n[declaration-shell-boundary] cases=${summary.cases} pass=${summary.pass} failed=${summary.failed}`
  + ` migrated=${summary.migratedCases} counterfactualSensitive=${summary.counterfactualSensitive}`
  + ` rootShell=${R.EnableRootDeclarationShell}`,
);
if (args.json) {
  console.log(JSON.stringify(summary, null, 2));
}
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`);
}
process.exit(summary.failed === 0 && failures.length === 0 ? 0 : 1);
