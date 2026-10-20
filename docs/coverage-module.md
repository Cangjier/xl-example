# module / export / import-equals declarations 覆盖记录

分支 `cover-import-equals-1`（从 `origin/integration` @4054100e 起，merge `origin/cover-module-1` @1d30ff60）。
产物：`node typescript/cases/ast-json.mjs module-declarations` 生成三份快照，
`node typescript/cases/ast-json-diff.mjs module-declarations` 逐条与 TS 对拍。

## 读数

| 指标 | 数值 |
| --- | --- |
| merge 后基线（14 个构造，含 module-declarations 12 条） | 1351 / 1351 |
| module-declarations 本轮 | **23 / 23** 完全一致（12 原有 + 11 新增） |
| import.ts（硬回归） | **54 / 54** 完全一致（结构差 / 位置差 / 字段差均 0） |
| 全量（15 个构造） | **1362 / 1362** 完全一致 |
| tsc / xl_check（改动文件） | 0 error |

## 已放开并全绿

| 形态 | TS kind | 实现 |
| --- | --- | --- |
| `export = x;` / `export = f;` | `ExportAssignment` → 表达式 | `export-assignment-possible-shape`（阶段扫描到 `;`）+ `-shape.FromUnits` |
| `export as namespace N;` | `NamespaceExportDeclaration` → `Identifier` | `namespace-export-declaration-possible-shape` + `-shape.FromUnits` |
| `import x = require("m");` / `'m'` | `ImportEqualsDeclaration` → `Identifier` + `ExternalModuleReference` → `StringLiteral` | `import-equals-declaration-possible-shape` + `-shape.FromUnits` |
| `import z = A.B;` / `import w = A.B.C;` | `ImportEqualsDeclaration` → `Identifier` + `QualifiedName`（左结合嵌套） | 同上；diff 里已有 `FirstNode → QualifiedName` 归一 |

## 根因与修法（import-equals 挂载时序）

module-1 的实现本身是对的，但 root 一启用就撞 `CatalogGuide: 终结候选与其它候选同时成立`，并让 import.ts 47 条结构差。
根因不是 import-equals 本身，而是 **候选集合变化改变了 import-declaration 的挂载点**：

1. 没有 import-equals 时，`import` 关键字关闭那一刻 root 侧只剩 `ImportDeclarationPossibleShape`，
   `IsBuildable = Stage !== 0` 当场挂载 shell（`import` token 下标）；shell 随后收到名字 / `from` / 字符串，
   `ImportClausePossibleShape` 在名字关闭那一格就建出子句。
2. 加上 import-equals 后，`import` 那一刻两个候选都 `Uncertain` → `Candidates.size > 1` → Waiting，
   挂载被推迟到名字关闭那一格；shell 里带着 `from` 才等到 `ImportClausePossibleShape.Compute`，
   那时 tail 是 `from`（Uncertain）而 `StringLiteralPossibleShape` 还活着 → 错过子句建立点，
   之后 tail 变字符串，ImportClause 直接 Reject：`ImportClause` / `Identifier` 全部丢失。

**修法（保持 CatalogGuide 契约不变）**：

- `import-equals-declaration-possible-shape.xl.md`：`import` 关键字刚关闭时就按**文档前视**决定去留——
  `NextAfterName` 跳过空白与 `//`、`/* */` 注释读掉名字、再跳过 trivia 看下一个字符是否 `=`；
  不是 `=`（`from` / `,` / `{` / `"` / `*` / `type` …）立即 `Reject`。这样普通 import 的候选集合
  与启用前**完全一样**，shell 仍在 `import` token 上挂载，import.ts 54 条一条不差。
  名字关闭那一格保留同一判据（`NextChar`）作为第二道保险。
- `import-declaration-possible-shape.xl.md`：`Stage 1` 遇到 `Symbol "="` 立即 `Reject`——把 `import x = …`
  彻底让给 import-equals；两候选在 `=` 处收敛成唯一候选，`import-equals` 在 `;` 那一格建整条。
- `source-file-shape.xl.md`：按并集解决候选列表冲突，并启用 `new ImportEqualsDeclarationPossibleShape(),`。

`external-module-reference-possible-shape.xl.md` 未被使用（require 形由 `ImportEqualsDeclarationShape.FromUnits`
直接读 `Bracket.Data` 建 `ExternalModuleReferenceShape`），保持桩不动。

## 新增用例（module-declarations.ts）

- base：`import x = require("m");`、`import y = require('other');`、`import z = A.B;`、`import w = A.B.C;`
- trivia：尾注释、`import /* c */ x = …`、`import x /* c */ = …`、`import x =\nrequire("m");`、
  `require(\n"m"\n)`、前导空白、同文件两条 import-equals。
- 原有 export-assignment / namespace-export 12 条全部保留（并加 import-equals 与它们混排的重复形）。

## 暂缓

- `declare module "m" {}` / namespace / module block：依赖 statements 的 `BlockShape`（已合并，由 cover-module-blocks-1 负责）。
