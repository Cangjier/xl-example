# module / export declarations chunk 1 覆盖记录

分支 `cover-module-1`（从 `origin/integration` @ee750929 起）。
产物：`node typescript/cases/ast-json.mjs module-declarations` 生成三份快照，
`node typescript/cases/ast-json-diff.mjs module-declarations` 逐条与 TS 对拍。

## 已放开并全绿（root 候选只取消 2 行注释）

| 形态 | TS kind | 实现 |
| --- | --- | --- |
| `export = x;` / `export = f;` | `ExportAssignment` → 表达式 | `export-assignment-possible-shape`（阶段扫描到 `;`）+ `-shape.FromUnits`（初始化式走 `ExpressionBuilder`） |
| `export as namespace N;` | `NamespaceExportDeclaration` → `Identifier` | `namespace-export-declaration-possible-shape` + `-shape.FromUnits` |

时序：两者都是**原子形状**——候选扫描到顶层 `;` 时 `Done`，`IsBuildable` 只在 `DoneAt === tokenIndex`
那一格为真，`BuildByIndex` 一次性建整条（与 `TypeAliasDeclarationPossibleShape` 同一套）。
到 `;` 那一格时其它候选都已 `Reject`（`ExportDeclarationPossibleShape` 在第二格见到 `=` / `as` 即退，
`ExpressionStatementPossibleShape.CanStart` 保留 `export`，`TypeAliasDeclarationPossibleShape` 只认 `type`），
候选唯一，不触发「终结候选与其它候选同时成立」。

## trivia 叠加

每个 base 形态都叠了：尾注释、行内 `/* c */`、`\n` 真实换行、前导空白、重复形。

## 暂缓：`import x = require("m");`（实现已写好，root 候选未放开）

`import-equals-declaration-possible-shape` / `-shape` 已按 `import <名字> = require(<字符串>);` 实现并通过本文件
的独立验证（曾短暂放开时 require 形单测全绿）；但放开 root 候选会让 **所有** import 声明回归。
根因（不在本 chunk 写范围）：

1. `ImportDeclarationPossibleShape.IsBuildable` 是 `Stage !== 0`（`import-declaration-possible-shape.xl.md:152-157`），
   所以普通 `import a from "m"` 在见到名字后（第 3 个代码单元）就以「唯一候选」身份建出 mounted shell。
2. 加上 `ImportEqualsDeclarationPossibleShape` 后，`import <名字>` 这一段两个候选都 `Uncertain`，
   `CatalogGuide` 判 `Candidates.size > 1` → `Waiting`，**错过了**唯一的 shell 建立点；
   之后 `from` 处本候选 `Reject`、`ImportDeclaration` 仍 `Uncertain`，根终结候选在 ASI 边界
   `Accept` 而 `Candidates > 0`，抛 `CatalogGuide: 终结候选与其它候选同时成立`
   （实测 `import a\nfrom "m";`，下标 4），并让 import.ts 47 条结构差。
3. 结论：import-equals 不能在 root 层与 import-declaration 并存；正确修法是让
   `ImportDeclarationPossibleShape` 不要在 `import <名字>` 处就建 shell（推迟到确认 `from` / `{` / `;`），
   或把 import-equals 接入 `ImportDeclarationShape` 自己的子候选目录——两者都在
   `import-declaration-*`（cover-declarations-1 的 declarations 范围），本 chunk 不碰。

`import x = A.B;` 另有 `ast-json.mjs` 缺 `["FirstNode","QualifiedName"]` 别名的问题（TS 反查名是 `FirstNode`），
`-shape.FromUnits` 里的 `QualifiedName` 分支已写好，等别名 + 上面第 3 条一起放开。

## 暂缓：`declare module "m" {}` / namespace / module block

依赖 statements 的 `BlockShape`（未合并），由 cover-module-blocks-1 负责。
