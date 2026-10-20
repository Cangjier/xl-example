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
