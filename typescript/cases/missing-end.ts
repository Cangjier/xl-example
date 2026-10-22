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

// ── A 组：副作用 import 的 ASI 收口（本块修复） ──
// 根因：typescript/tokens/declarations/import-clause-possible-shape.xl.md : ImportClausePossibleShape.ComputeByIndex
//   （line 116 起）在「前一个代码单元是已关闭的 StringLiteralShape（模块说明符）」且当前是下一条
//   `import` 时把 import 当续接词 → 返回 Uncertain；壳 ImportDeclarationShape 的终结候选
//   （ImportDeclarationEndPossibleShape.ComputeByIndex，line 64 起）在同一个 ASI 格 Accept →
//   core CatalogGuide 抛「终结候选与其它候选同时成立（宿主 ImportDeclarationShape）」。副作用导入没有
//   ImportClause，该候选在 ASI 边界必须 Reject（只认 prev=StringLiteralShape && tail=import）。
// 何时 build：副作用 import 已收模块说明符，换行后下一条语句以 `import` 开头（ASI 边界那一格）。
// build 提取：本候选不建任何节点，只退出候选集；由终结候选收口本条 import。
// 何时 close：终结候选在同一格 Accept 后，BuildByIndex 的 ASI 支路把边界单元还给父单元并关闭壳。
// close 提取：最后一个代码单元（模块说明符字符串）的 SourceRange.End。
import "m"\nimport "n"
import "m"\nimport x from "n"
import "m"\nimport * as ns from "n"
import "m"\nimport { a } from "n"
import "m"\nimport type { T } from "n"
import "m"\n\nimport "n"
import "m" // c\nimport "n"
import "m"\nimport "n"\nclass C {}
import "m"\nimport "n"\nimport "o"
import "m"\nclass C {}
import x from "m"\nimport "n"
import "m";\nimport "n";

// 未收口 backlog：
//   B（空声明语句，探针 68 red：diff 35 / crash 10）：
//     `const` / `var` 单独成句（无 `;`，EOF / 换行前）TS 是空 VariableDeclarationList 的 VariableStatement，
//     本仓落 ExpressionStatement(Identifier)；`let;` TS 是 ExpressionStatement 而本仓是 VariableStatement；
//     `export const` / `export var` 单独成句崩溃「表达式语句没有读完」（source-file-end BuildTrailingDeclaration
//     的 isExportVariable 要求 code.length>=3，两格形落空）。归 variable-statement 族 / 末轮兜底，本块未动。
//   D/E（TS oracle 确认，不入尺子）：`export { a } from "m"\nwith { … }` → TS parseDiagnostics '(' expected；
//     `import x from "m"\nassert { … }` → Unknown keyword or identifier（TS 6.0.3 只认 with，且换行后已 ASI）。
//     全部 TS 非法，写注释 backlog，不建用例。

// ══ cover5 round5（missing end）：语句体 / 语句尾的 ASI 收口通道 + 声明族在 EOF 的兜底分支 ══
// 判据：TS 6.0.3 `ts.createSourceFile` 的 parseDiagnostics.length === 0，且本仓在修复前 CRASH 或 AST 不一致；
// 探针 tmp/probe-missing-end.mjs + tmp/candidates-final.json（48 条，基线 47 红 → 0 红；另一条 baseline 已绿，未收录）。
// 一行一个用例，行内 `\n` 由 ast-json.mjs 还原成真实换行。

// ── 1) 语句体的 ASI 收口：ScanExpressionBody 只认 `;` / EOF `while (a) b` ⏎ `c;` 的体会一路吃下一条语句 ──
// 何时 build：体在换行处结束（EndsAtLineBreak 成立）→ StatementScanner 收口 → StatementPossibleShape 建到 `b`。
// build 提取：WhileStatement / IfStatement / ForStatement 等的 body 子形状；语句 End = 最后一个代码单元。
// 何时 close：体的 ASI 边界——换行 + 前一个代码单元能收尾 + 当前单元不是续接符（与 ScanToSemicolon 同一张表）。
// close 提取：End 停在 `b`；边界单元 `c` 不归本语句，留给下一条语句。
while (a) b\nc;
if (a) b\nc;
for (;;) b\nc;
for await (const x of y) b\nc;
with (a) b\nc;
// trivia / 重复形：行尾注释、块注释、空行、体换行、两条循环连排
while (a) b // c\nc2;
while (a) b /* c */\nc;
while (a) b\n\nc;
while (a)\nb\nc;
while (a) b\nwhile (c) d\ne;
// if / else 链：then 体与 else 体各自按 ASI 收口
if (a) b\nelse c\nd;
if (a) b\nelse if (c) d\ne;
// 被标语句的体（`lab: a` 是 LabeledStatement，不是表达式语句：终结候选不许抢 ASI 边界）
lab: a\nc;
lbl: while (a) b\nc;
// debugger：`;` / EOF 之外的换行也收口，否则整段 leftover 拖到 EOF 被一条语句吞掉
debugger\nc;
debugger\n\nc;
debugger // c\nc2;
a;\ndebugger\nc;
class C {}\ndebugger\nc;

// ── 2) return 的受限产生式：关键字后换行 = 没有操作数（TS: ReturnStatement[0,6] + 下一条语句） ──
// 修前 ScanReturnOrThrow 只对 `throw` 认这条；`return` 会一路吃到下一条语句的 `;`，报「语句没有读完」。
// 何时 build：`return` 之后到达的代码单元与本关键字之间有换行（含行注释换行）→ 收在关键字上。
// close 提取：ReturnStatement 的 End = 关键字右边界（换行后的 `;` 仍归本条，End 含分号）。
return\nc;
return // c\nc2;
while (a) return\nc;
if (a) return\nc;
lbl: return\nc;

// ── 3) 无分号声明 + 后续语句：EOF 兜底的前缀/后缀递归里，后缀 `z ;` 曾按 requireSemicolon=false 建 → 抛错 ──
// 何时 build：EOF 时 leftovers 里「声明前缀 + 表达式语句后缀」按最后一条语句起点切分，前缀递归建声明。
// close 提取：后缀按 requireSemicolon=true 入口建（`;` 从表达式单元里切掉、End 停在 `;` 上）。
import x = require("m")\nz;
declare module "m"\nz;
export as namespace A\nz;

// ── 4) EOF 兜底的声明族分支：export import = / 无 declare 的字符串模块 / async 无体函数 / export default 无体函数 ──
// export import x = …：TS 是带 ExportKeyword 的 ImportEqualsDeclaration，从 `import` 那格建、ExportKeyword 插回最前。
// module "m" / module "m";：TS 是无体 ModuleDeclaration（children 只有字符串名），补/用 `;` 走无体分支。
// async function f(): void：重载签名可带 async（TS 只做语义检查），与 `function f(): void` 同族。
// export default function f(): void：带 export / default 修饰的 FunctionDeclaration，修饰词插回 Data 最前。
export import x = A.B
export import x = require("m")
export import type x = A.B
export import type x = require("m")
export import x = A.B // c
class C {}\nexport import x = A.B
module "m"
module "m";
module "m"\nclass C {}
async function f(): void
declare async function f(): void
async function f(): void\nclass C {}
export default function f(): void
export default function f(a: A): B
export default function* g(): void
export default async function f(): void
export default function f(): void;
export default function f(): void // c
export default function f(): void\n
export = a\nexport import x = A.B
