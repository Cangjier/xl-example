# cover8-C：块内 import/export、ExportAssignment、模板块 export、`@dec` 接 function/enum

作者：missing-possible ｜ 分支：`cover8-blockdecl` ｜ 基点：`3fcd2e37`（cover8 prep HEAD）
工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover8-blockdecl` ｜ 日期：2026-10-22

## 1. 读数（修改前 → 修改后）

| 门禁 | 基线 | 本分支 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5797 / cj-ok 5797 / fail 0 | **5841 / cj-ok 5841 / fail 0**（+44） |
| `node typescript/cases/ast-json-diff.mjs` | 5797/5797，0/0/0 | **5841/5841，结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | 1714（ok 1704 / ts-invalid 10 / crash 0 / diff 0） | **1714（ok 1704 / ts-invalid 10 / crash 0 / diff 0）不变** |
| `node ./tests/parse/validate.mjs`（cases:check） | 1718 条 / 0 不合格 | **1718 条 / 0 不合格**（无新夹具，只加 case 行） |
| `node typescript/cases/real-dts-ast.mjs` | 226/226，0 崩溃，AST 全一致 | **226/226，0 崩溃，AST 全一致** |
| `tsc -p tsconfig.json` | 0 | **0** |
| `xl_check`（core+typescript，863 文件） | 0 error | **0 error**（仅既有 W3102/W3103 warning） |
| `core/**` 改动 | — | **0 文件** |
| 单 stem `missing-possible` | 91 用例 | **135 用例，135/135 一致** |

## 2. 逐条探针（TS 6.0.3 `parseDiagnostics` 口径；tmp 探针 52 条，TS 非法 0 条）

| # | 形态 | TS diag | 修前 | 修后 |
|---|---|---|---|---|
| 1 | `{ import 'm'; }` / `{ import x from 'm'; }` / `{ import { a } from 'm'; }` / `{ import * as ns from 'm'; }` / `{ import type { A } from 'm'; }` / `{ import x from 'm' with { type: 'json' }; }` | 0 | crash「表达式没有读完」 | ✅ 一致 |
| 2 | `{ import x from 'm'` ⏎ `let b = 1; }`（无分号 ASI） | 0 | crash「表达式没有读完」 | ✅ 一致（零宽合成 `;` + `ClauseEnd`） |
| 3 | `{ import x = require('m'); }` / `{ import type x = require('m'); }` | 0 | crash「表达式没有读完」 | ✅ 一致（`ImportEqualsDeclaration`） |
| 4 | `{ export { a }; }` / `{ export * from 'm'; }` / `{ export * as ns from 'm'; }` / `{ export { a } from 'm'; }` / `{ export type { A }; }` / `{ export type * from 'm'; }` | 0 | crash「表达式没有读完」 | ✅ 一致（`ExportDeclaration`） |
| 5 | `{ export { a }` ⏎ `let b = 1; }`（无分号） | 0 | crash「表达式没有读完」 | ✅ 一致 |
| 6 | `{ export as namespace X; }` / `{ export import x = require('m'); }` | 0 | crash「表达式没有读完」 | ✅ 一致（`NamespaceExportDeclaration` / `ImportEqualsDeclaration`） |
| 7 | `{ export = foo; }` / `{ export = class {}; }` / `{ export default 1; }` / `{ export default foo(); }` / 无分号 `export = foo` / `export default foo` | 0 | 错树：`ExpressionStatement(BinaryExpression(export,=,foo))` | ✅ 一致（`ExportAssignment`，children 只有表达式） |
| 8 | `{ export default function () {} }` / `function* () {}` / `async function () {}` | 0 | crash「函数声明的名字不是标识符」 | ✅ 一致（匿名 `FunctionDeclaration`，children 只有 export/default/*/体） |
| 9 | `{ export default class {} }`（对照，修前已通过） | 0 | ✅ | ✅ 无回归 |
| 10 | `declare module 'm' {` ⏎ `export { a }` ⏎ `}` / `export * from 'n'` 无分号 / 后接 `let b = 1;`；`namespace N { export { a } }` | 0 | 错树（`Block` + `ExportKeyword`）或 crash「export declaration has trailing units」 | ✅ 一致（`ModuleBlockShape` 无分号子句收口） |
| 11 | `{ @dec function f() {} }` / `@dec` ⏎ `function f() {}` / `@dec('x')` ⏎ `function f() {}` / `declare module 'm' { @dec function f(): void; }` | 0 | crash「不支持的表达式起点」 | ✅ 一致（块内装饰器通道 + `FunctionDeclarationShape.FromUnits` 装饰器前缀） |
| 12 | 根级 `@dec function f() {}` / `@dec` ⏎ `function f() {}` | 0 | crash「不支持的表达式起点」（根级零候选） | ✅ 一致（`FunctionDeclarationPossibleShape` Stage 8） |
| 13 | 根级 `@dec enum E { A }` / `@dec` ⏎ `enum E { A }`；块内两种排布（修前块内已通） | 0 | 根级 crash「不支持的表达式起点」 | ✅ 一致（`EnumDeclarationPossibleShape` Stage 6） |

**记录但不入尺子（TS parse 合法、任务范围外）**：`{ @dec` ⏎ `const x = 1; }`
（TS AST = `VariableStatement` + `Decorator` child；本项不在本任务目标 5 条清单内，未修，见 §7）。

## 3. 根因（file:line，修复后行号）

1. **块层 `BuildStatement` 没有 import/export 语句分派**（`typescript/tokens/statements/statement-builder.xl.md:214`）：
   原先 `export` 只走「`export` + 声明头」一条路（`IsExportDeclarationHead`），模块说明符形态与
   ExportAssignment 都落到 `BuildExpressionStatement()` 兜底；`import` 完全没有分派。
   修复：`:794 BuildImportStatement`、`:832 BuildExportStatement`（+ `:894 BuildExportClauseStatement`、
   `:919 BuildExportImportEquals`、`:943 BuildNamespaceExportDeclaration`、`:967 BuildExportAssignmentStatement`），
   以及子句工具 `:700 IsImportStatementHead` / `:723 IsClauseContinuation` / `:741 ClauseEnd`
   / `:764 SynthesizeSemicolon` / `:784 RemoveSemicolon`。
2. **`FunctionDeclarationShape.FromUnits` 不认装饰器、且名字必填**
   （`typescript/tokens/declarations/function-declaration-shape.xl.md:71`）：
   修复：装饰器前缀扫描（与 `EnumDeclarationShape` 同口径）+ `allowAnonymous` 可选形参；
   `statement-builder.xl.md:452 BuildFunctionDeclaration` 透传该口子（默认分支设置 `AllowAnonymousFunction`）。
3. **根级 function/enum 的 possible 候选不认 `@`**
   （`typescript/tokens/declarations/function-declaration-possible-shape.xl.md:125`、
   `typescript/tokens/declarations/enum-declaration-possible-shape.xl.md:97`）：
   Stage 0 遇到 `@` 直接 Reject → 根级零候选。修复：各加一个「装饰器只读扫描 Stage」
   （function Stage 8 / enum Stage 6），只认本族关键字、见其它声明族关键字即退出。
4. **`ModuleBlockShape.BuildMember` 的 export 子句分支只认有分号**
   （`typescript/tokens/declarations/module-block-shape.xl.md:366` 起）：
   无分号成员 `export { a }` ⏎ 下一个成员时 `specialEnd` 找不到；而且在 `;` 上盲扫会把
   下一个成员的 `;` 当成自己的（「export declaration has trailing units」）。
   修复：单次扫描同时看 `;` 与「换行后的成员首词」，无分号补零宽合成 `;`（与同类无分号路径同款）。
5. **无分号子句的块级 ASI 收口**：`ClauseEnd` 用块级判据 `StatementBuilder.EndsAtLineBreak`
   （**未改**换行判据本身，仅调用），并放过 `from` / `with` / `assert` / `as` 这些延续词。

## 4. 四问（本族：缺少 possible / 块层分派）

1. **正确的应该什么时候 build**：块 / 体 / 模块体里，声明头（`import` / `export`）到齐时由
   `BuildStatement`（模块体内是 `ModuleBlockShape.BuildMember` 的分派）一次建完；
   模块说明符子句的「到齐」= 具名子句的 `}` 或模块字符串（+ attributes），无分号时按块级 ASI 收口。
2. **build 时应该提取哪些信息**：import/export 子句 / 模块字符串 / attributes / export 名字 /
   ExportAssignment 的表达式区间；`export` / `default` / `type` / `from` / `;` 不进 children
   （与 TS 完全一致）；修饰词 Pos 用本层 `Positions[first]` 重锚（`AnchorFirstModifier`）。
3. **什么时候 close**：`FromUnits` 内一次建完即关闭；无分号时补的合成 `;` 只用于满足
   `FromUnits` 的「末尾必须是 `;`」前置条件，建完立即从 `Units`/`bracket.Data` 摘掉。
4. **close 时应该提取哪些信息**：子句树（`NamedExports` / `ExportSpecifier` / `NamespaceExport` /
   `ImportClause` / `ExternalModuleReference`）、模块字符串、attributes、表达式；
   区间与 Pos 与 TS 同口径（`Pos` 含前导 trivia，`End` 不含 `;`——与既有根路径一致）。

## 5. 修复文件

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-builder.xl.md` | import/export 语句分派 + 5 个子分派 + 5 个工具方法；`BuildFunctionDeclaration` 透传匿名；`IsExportDeclarationHead` 保持原语义（声明头路径仍由 `BuildExportedStatement` 处理） |
| `typescript/tokens/declarations/function-declaration-shape.xl.md` | 装饰器前缀 + `allowAnonymous` |
| `typescript/tokens/declarations/function-declaration-possible-shape.xl.md` | 根级 `@` 装饰器 Stage 8 |
| `typescript/tokens/declarations/enum-declaration-possible-shape.xl.md` | 根级 `@` 装饰器 Stage 6 + `Symbol` import |
| `typescript/tokens/declarations/module-block-shape.xl.md` | export 子句无分号成员收口（含「下一个成员的 `;`」误吞修复） |
| `typescript/cases/missing-possible.ts` | 末尾唯一标记段 `// ══ cover8（块内 import/export 与装饰器声明头）…`，+44 条（91→135） |
| `typescript/cases/missing-possible.{ts,cj}-ast.json` | `ast-json.mjs missing-possible` 重新生成（快照随分支提交） |

**未改**：`typescript/tokens/statements/statement-scanner.xl.md`（本族全在块层直接分派，不需要动根语句扫描；
也避免了与 cover8-A / cover8-D 在换行判据上的同文件冲突）；`expression-statement-possible-shape.xl.md`
未动；`core/**` 零改动；IMPORTANCE 未动。

## 6. 测试增量（+44，`missing-possible` 单 stem 135/135）

分组：块内 import 声明 11（含无分号 / 重复形 / trivia / import-equals / type-only）；块内 export 子句 10；
块内 ExportAssignment 6（含无分号）；匿名 `export default function/class` 4；模板块无分号 export 子句 4；
装饰器接 function/enum 9（块内 / 模板块 / 根级，换行与同行）。全部 base 先行，随后 trivia / 重复形变体，
一行一例（`\n` 转义）。

## 7. 遗留 / 需裁定

1. `{ @dec` ⏎ `const x = 1; }`（装饰器贴 VariableStatement，TS AST = `VariableStatement[Decorator, VariableDeclarationList]`）
   TS parse 合法但不在本任务目标清单，**未修**（若需要，落点同 §5：块层 `@` 分派 + VariableStatement 插装饰器）。
2. 根级 `export as namespace` / `export =` / `export default <expr>` 走原有候选，本任务未改；块内对应形态已修。
3. 无分号子句收口依赖块级 ASI 判据（`StatementBuilder.EndsAtLineBreak`）；`export { a }` ⏎ `from "m"`
   这种「from 换行」已用延续词放过，但更怪的跨行组合（如 attributes 跨多行 + 注释）没有逐条探针，
   若后续语料暴露再补。
4. 与 cover8-A / cover8-D 的同文件重叠：本分支只动块层声明/装饰器分派与 `ModuleBlockShape` 无分号成员，
   未改 `statement-scanner.xl.md`、未改换行判据与 export ASI 判据，合并时 Hunk 面较小。
