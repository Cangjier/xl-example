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
