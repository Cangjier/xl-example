# import attributes 覆盖记录

分支 `cover-import-attrs-1`（integration @d3c27487）。本文件登记 import/export attributes 的合法性判定与用例。

## 合法性（oracle = ts.createSourceFile().parseDiagnostics，TS 6 全部 0）
- `with { … }` 静态 import / re-export：合法（TS 5.3+ 标准语法）。
- 旧 `assert { … }`：本仓 TS 版本仍判合法（仅 `with` 为标准写法）；因此 `assert` 用例与 `with` 并存。
- `import type x from "m" with {…}`：合法（type-only import 带 attributes）。
- dynamic `import("m", { with: { … } })` / `import("m", { assert: { … } })`：合法。

## 本 chunk 新增全绿用例（import.ts / export.ts）
- import：`import { a } from "m" with { type: "json" };`、`import * as ns from "m" with {…};`、
  `import x from "m" with { a: "b", c: "d" };`（多属性）、`import type x from "m" with {…};`、
  `import { a } from "m" assert {…};`，以及前导空格/行尾注释/词间块注释/换行变体（+10 条）。
- re-export：`export * from "m" with { type: "json", a: "b" };`、`export * as ns from "m" with { a: "b", c: "d" };`、
  `export { a } from "m" with { type: "json", other: "x" };`、`export * as ns from "m" with {…}; // c`
  等（+6 条）。

## 暂缓（未改 token 源）
- dynamic import `import("m")` / `import("m", { with: { … } })` / `import("m", { assert: { … } })` ——
  语句层起点 `import` 被 `ExpressionStatementPossibleShape.CanStart` 明确拒绝（statements 家族文件），
  要做需改该文件 + 在 ExpressionBuilder 加 `import` 关键字 leaf；属 statements/expression 归属，本 chunk 只记目标。
- `export { a } from "m"\nwith { … }` —— TS 在 `from "m"` 之后换行即 ASI，`with {…}` 成为独立 WithStatement；
  本仓 attributes 会跨行续接（ASI 语义差）。属 attributes/ASI 识别时机问题，本 chunk 记录不硬改。
- 已有基线用例覆盖：`import a from "m" with/assert {…}` 单/多属性、`export { a } from "m" with/assert {…}`、
  `export * from "m" with {…}` —— 未重复添加。

## dynamic import（chunk dynamic-import）

- 机制：`ExpressionStatementPossibleShape.CanStart` 早已放行 `import`，真正的闸门是 `ComputeByIndex` 的 `ImportStage`
  状态机（只认 `import . meta`）。本 chunk 让 `ImportStage === 1` 在下一代码单元是 `(` 时也放行（`ImportStage = 3`，
  动态 import 调用起点），`import x from "m"`（下一格是标识符）与 `import { … }`（`{`）仍 Reject，import 声明不受影响。
- `ExpressionBuilder.ParsePrimary` 的 `import` 分支新增：`At` 已越过 `import` 且 `Peek(0)` 是 `(` 时，返回
  `ImportKeywordShape` 叶子；随后的 call 由 `ParsePostfix` 建 `CallExpression`（TS children：`ImportKeyword` + 参数）。
- 新增全绿用例（import-meta.ts，+13）：`import("m");`、`import("m").then(f);`、`const p = import("m");`、
  `import("m", { with: { type: "json" } });`、`import("m", { assert: { type: "json" } });`、`f(import("m"));`、
  `await import("m");`、`(await import("m")).default;`、`import("m").T;`，以及前导空格/词间块注释/行尾注释/换行变体。
- 回归：import-meta 30 条与 import 64 条保持全绿；全量无回归。
## root `export import A = ...` aliases（chunk export-import-alias）

- 归属：root 级 `export import` 交给 **import-equals 候选**（不是 export-declaration）：`ImportEqualsDeclarationPossibleShape`
  的 Stage 0 接受可选前导 `export`（新 Stage 30 等 `import`，再复用原有 `NextAfterName(...) === "="` 前瞻），
  这样在 `import` 之后 `A =` 的模式下候选不 Reject，根 import 候选因「候选不唯一」不会提前 mount
  ImportDeclarationShape shell（原来的 `缺少模块说明符` 错误来源），到 `;` 时唯一候选 Done 后建树。
- `ImportEqualsDeclarationShape.FromUnits`：支持可选的 `export` 前缀（`base` / `exportUnit`），子形状顺序与 TS 一致
  `[ExportKeyword, Identifier, ExternalModuleReference|QualifiedName]`；ExportKeyword Pos = `export` 前一个非 trivia 的
  End+1；新增 `IsTypeOnly` 字段（`import ... type` 形保留能力，但候选前瞻暂未接，见暂缓）。
- 新增全绿（import.ts +7 / export.ts +1）：`export import A = B.C;`、`export import A = require("n");`、
  `export import A = B.C.D;`、`export import E = B.C;`（export.ts 侧），以及前导空格/行尾注释/词间块注释/重复语句 trivia；
  回归 `import A = B.C;`、`import A = require("n")`、`namespace N { export import A = B.C; }` 全绿。
- 暂缓：`export import type A = B.C;` —— oracle 合法（ImportEqualsDeclaration.isTypeOnly），但
  ImportEquals 候选的 `type` 前瞻未接（会退到 import 候选并 shell 报错），需要改候选前瞻的 NextAfterName 逻辑，
  本 chunk 只记录不硬改。
## type-only import-equals（chunk export-import-type）

- `ImportEqualsDeclarationPossibleShape` 的 raw lookahead `NextAfterName` 现在跳过可选的 `type` 修饰词：
  读到第一个词是 `type` 时再读一个名字词，然后返回其后的第一个非 trivia 字符（要求 `=`），所以
  `import type A = ...` / `export import type A = ...` 不会在 `import` 之后被错误 Reject。
- 状态机新增 Stage 7：`import` 之后先见到 `type` 时等真正的名字，再到 Stage 2 等 `=`；其余阶段不变。
- `ImportEqualsDeclarationShape` 侧：既有可选 `type` 解析（IsTypeOnly + name Pos = `type`.End+1）已就绪；
  oracle 显示 TS 的 ImportEqualsDeclaration 只带 `isTypeOnly` 标志，`type` **不是** child 节点，因此不新增 TypeKeyword child。
- 新增全绿（import.ts +7）：`export import type A = B.C;`、`import type A = B.C;`、`export import type D = require("n");`、
  `import type A = require("n");`，以及前导空格/行尾注释/词间块注释/`export import type A = B.C.D;` trivia；
  回归：`export import A = B.C;`、`import A = B.C;`、`import A = require("n")`、namespace 形式全绿。
## import phase modifiers：`import defer`（TS 6.0.3，chunk import-modifiers）

- **Probe 结论（安装版本 TS 6.0.3，`ts.createSourceFile(...).parseDiagnostics`）**：
  - `import defer * as ns from "m";`、`import defer { a } from "m";`、`import defer a from "m";`、
    `import defer a, { b } from "m";`、`import defer * as ns from "m" with { x: "y" };`、`import defer { a } from "m" assert {…};`
    全部 diag=0 → 实现。
  - `import source * as ns from "m";` diag=3、`import source { a } from "m";` diag=2 → **不合法**（source 不是 import phase modifier），
    写成 `//` 目标 + 版本与 diag 数，不静默跳过。
- **TS AST 口径**：`defer` **不是 child 节点**，而是 `ImportClause.phaseModifier`（数值 166）。
  TS children 与普通 import 相同：`ImportDeclaration > ImportClause > NamespaceImport / NamedImports / Identifier` + StringLiteral；
  `import defer from "m"` 里 `defer` 是默认导入名（no phaseModifier），两者按「`defer` 后面第一个词是不是 `from`」区分。
- 实现（`declarations/import-clause-possible-shape.xl.md` + `import-declaration-shape.xl.md`）：
  - `ComputeByIndex` 与 `IsBuildable`：`defer` 作为 phase modifier 时**不允许立即收子句**（原实现会在 `defer` 这一格就把
    `defer` 建成 default name 并挂载 clause；现在 raw lookahead 判 phase 时返回 Uncertain / false，等真正的绑定到来）。
  - 新增 `IsDeferPhaseModifier(unit)`：跳过 trivia 后读第一个词，`from` → 不是 phase（默认名），其余 → phase。
  - `BuildByIndex`：识别到 phase 后置 `ImportClauseShape.PhaseModifier = "defer"` 并跳过 `defer`，从真正的
    名字 / `*` / `{` 起按既有分支建子形状（Pos 口径不变）。
  - `ImportDeclarationShape.IsLegalResidue` 白名单加 `defer`（clause 延后收尾时 `defer` 会作为挂载壳里的合法残留）。
- 新增全绿用例（import.ts，+13）：上述 defer 各族 + `import defer a, { b }` + 带 attributes/assert + 前导空格 / 词间块注释 /
  行尾注释 / `defer` 与绑定之间换行；`import defer from "m"`（默认名）也在内。
- 回归：`export type * from "m";` / `export type * as ns from "m";` 已绿（本次只记录）；`import a from "m" with { type: "json" }`
  已绿；import 93/93、export 全绿、全量无回归。

## 分支合并补记（docs 补全，数据由 git 推导）

> 用例行增量取 `git diff <merge>^1 <merge> -- typescript/cases/*.ts` 的 numstat（仅 .ts）；
> 实现文件取 `git diff --name-only <merge>^1 <merge> -- typescript/tokens`；tip = `git rev-parse <merge>^2`。
> 合并提交未记录 deferred，详见对应分支提交与报告。

- `cover-import-modifiers-1` @ `1e33a323` — (import defer phase modifier)；cases +18/-0（import）；impl: import-clause-possible-shape,import-declaration-shape
- `cover-import-export-eof-1` @ `9127dbbe` — (export/import declarations at EOF)；cases +21/-2（end-declarations,export,import）；impl: export-declaration-end-possible-shape,export-declaration-possible-shape,import-declaration-end-possible-shape,source-file-end-possible-shape
- `cover-import-type-attrs-1` @ `bb98f6d3` — (import type attributes)；cases +11/-1（types）；impl: import-type-shape,type-builder
- `cover-import-meta-1` @ `17592028` — (import.meta / new.target)；cases +44/-0（import-meta）；impl: import-declaration-possible-shape,import-declaration-shape,expression-builder,expression-statement-possible-shape
- `cover-import-equals-1` @ `af5556d7` — (import x = require())；cases +12/-6（module-declarations）；impl: import-declaration-possible-shape,import-equals-declaration-possible-shape,source-file-shape
