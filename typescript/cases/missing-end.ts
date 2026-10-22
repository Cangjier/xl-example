// §6「缺少 end」：块体 / ModuleBlock 没有自己的终结候选，只能靠外层或 `;` 收口。
// 覆盖组：G2b 函数体 / 构造器体、G2c ModuleBlock 里的 `import =` / `export =`、I 的 `export as namespace`。
// 来源：token-repros/end-modules-c1-c2-c3-g2c.ts（已并入）；一行一个用例，
// 行内 `\n` 由 ast-json.mjs 还原成真实换行。§5 口径：base 在前，重复形/trivia 变体在后。
//
// 覆盖标准③审计补强：原始失败语料（tests/cases/token/）逐条落成最小等价用例——
//   G2b（docs/token-ast-analysis-declarations.md §G2b，2 条）：fn-generator.ts 的
//     `yield 1` 换行 `yield* other()`、cls-super-newtarget.ts 的 `super()` 换行 `if (…)`；
//   另按「块体也是收口单元」补齐 方法体 / 访问器体 / 箭头块体 / static block / if-while-for-do 体。
//   G2c（同文 §G2c，3 条）：decl-namespace-import-equals-alias.ts（`import A = B.C` 无分号）、
//     decl-namespace-import-equals-require.ts（`import x = require("m")` 无分号）、
//     decl-namespace-export-equals.ts（`export = a` 无分号）；另补 module/declare module 体成员。
//   I（docs/token-ast-analysis-statements.md §I，1 条）：ambiguous/am-export-equals-namespace.ts
//     （`export as namespace A` 无分号收在文件末尾，后接 `export = A`）。
// 末组补 `export =` / `export default` / `export {}` / `export { … }` / `export * from` 的行末收口
// （与 docs/end-close-analysis.md C1 同族：收口只认 `;`，块尾/EOF 没有通道）。

// ── G2b：函数体本身就是收口单元（base → 无分号形变） ──
function f() {}
function g() {\n  foo()\n  bar()\n}
function h() { foo() }
function* i() {\n  yield 1\n  yield* other()\n}
function j() {\n  return 1\n}
const k = function () {\n  foo()\n  bar()\n}

// ── G2b：构造器体 / 方法体 / 访问器体 / 箭头块体 ──
class C { constructor() { } }
class C1 extends B { constructor() {\n    super()\n    foo()\n  } }
class C2 { m() {\n    foo()\n    bar()\n  } }
class C3 { get x() {\n    foo()\n    return 1\n  } }
class C4 { set x(v) {\n    foo()\n    bar()\n  } }
const arrow = () => {\n  foo()\n  bar()\n}

// ── G2b：其它块体（if / while / for / do）体内的无分号序列 ──
if (a) {\n  foo()\n  bar()\n}
while (a) {\n  foo()\n  bar()\n}
for (;;) {\n  foo()\n  bar()\n}
do {\n  foo()\n  bar()\n} while (a)

// ── G2b：static block 体内最后一条无分号成员（TS 4.4+，块尾 `}` 收口） ──
class C5 { static {\n    foo()\n    bar()\n  } }

// ── G2c：import = / export =（无分号到块尾） ──
import A = A.B;
namespace N1 { import A = B.C }
namespace N2 { import x = require("m") }
namespace N3 { const a = 1; export = a }
import A2 = A.B
namespace N4 { import A = B.C\n  import D = E.F }
namespace N5 { import x = require("m")\n  const a = x }
module M1 { import A = B.C }
declare module "m1" { import A = B.C }

// ── G2c：declare module / global / namespace 体里的无分号成员（多成员 = 重复形） ──
declare module "x" {\n  export function f(): void\n  const y: number\n  export default y\n}
declare module "*.css" {\n  const content: string\n  export default content\n}
declare global { interface Window { x: A } }
declare namespace A { namespace B { const x: number } }
namespace N7 {\n  const a = 1\n  const b = 2\n}
namespace N8 {\n  export const a = 1\n  export function f(): void\n}
declare module "m3" {\n  export = y\n}
declare module "m4" {\n  export as namespace X;\n}

// 已修复（fix-missing-end）：ModuleBlock / namespace 体里的 `export as namespace` 原先只认 `;` 收口，
// 三种无 `;` 形都 CRASH「表达式没有读完」；ModuleBlockShape.BuildMember 现按「名字单元即段末 +
// 零宽合成 `;`」收口（与 import= / type 别名 / 顶层 source-file-end 的 isExportAsNamespace 同款），
// 下面 m6 / m7 / X2 三条无分号形为活跃用例（m4 / X1 是带 `;` 对照）。
// ── I：export as namespace（无分号收在文件末尾） ──
declare namespace A {}\nexport as namespace A
export as namespace JSON
declare namespace B {\n  namespace C {\n    const x: number\n  }\n}\nexport as namespace B\nexport = B
namespace X1 { export as namespace Y; }
declare module "m6" {\n  export as namespace Z\n}
declare module "m7" { export as namespace Z }
namespace X2 { export as namespace Z }

// ── C1 同族：export = / export default / export {} / export * 的行末（EOF）收口 ──
const z = 1\nexport = z
const y2 = 1\nexport default y2
export {}
export { z }
export * from "m"

// ── 无体 ambient module 到 EOF 的收口（本块修复） ──
// 根因：typescript/tokens/files/source-file-end-possible-shape.xl.md : BuildTrailingDeclaration（line 281）
//   只认「最后一块是 `{`」的 namespace / module / global；`declare module "m"`（无体、无 `;`）没有
//   Accept 点，leftover 落进 ExpressionStatement 兜底 → 「表达式语句没有读完」。
// build 时机：EOF leftovers 以 `declare module` 开头且只有三格（declare + module + 字符串名，无体无分号）；
//   多条连排时它是前缀递归（`declare module "m"` ⏎ `class C {}` 的 boundary 切出的前缀）。
// build 提取：DeclareKeywordShape + StringLiteralShape（无 ModuleBlock；TS 的 End 停在字符串右边界）。
// close 时机：补零宽合成 `;` 后由 ModuleDeclarationShape.FromUnits 的无体分支（terminatorIndex）收口；
// close 提取：最后代码单元（模块字符串）的 SourceRange.End。
declare module "m"
declare module "m"\n
declare module "m" // c
declare module "m"\nclass C {}
declare module "m"\ninterface I {}
declare module "m"\ndeclare module "n"
declare module "m"\nclass C {}\ninterface I {}
declare module "m"\n\nclass C {}
declare module "m"\nclass C {} // c
declare module "m";\nclass C {}

// 未收口 backlog（探针复现 5 条，TS parseDiagnostics=0；本块不改 import 声明候选的 ASI 通道）：
//   import "m"\nimport "n"                 ← 崩溃：CatalogGuide: 终结候选与其它候选同时成立（宿主 ImportDeclarationShape，下标 4）
//   import "m"\nimport x from "n"          ← 同上
//   import "m"\nimport * as ns from "n"    ← 同上
//   import "m"\nimport { a } from "n"      ← 同上
//   import "m"\nimport type { T } from "n" ← 同上
//   对照（全绿）：import "m"\nclass C {} / import x from "m"\nimport "n" / import "m";\nimport "n";
//   根因方向：typescript/tokens/declarations/import-declaration-possible-shape.xl.md : ComputeByIndex（Stage 1）
//   对副作用导入的模块说明符 String 只 continue，候选在 ASI 边界仍 Uncertain；壳 ImportDeclarationShape 的
//   终结候选（ImportDeclarationEndPossibleShape.ComputeByIndex）Accept 时普通候选未 Reject → core CatalogGuide
//   抛共存。修法需让副作用导入在说明符处 Accept/建壳或让宿主候选在该格 Reject，属 import 声明流水线，本块不动。
