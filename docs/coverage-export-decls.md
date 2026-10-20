# export declarations chunk 2 覆盖记录

分支 `cover-export-decls-1`（从 `origin/integration` @4054100e 起，含 statements/class/interface/enum/types chunk1）。
产物：`node typescript/cases/ast-json.mjs export` + `ast-json-diff.mjs export`。

## 本 chunk 新增（`export.ts` base 8 / 9，全部逐条对拍 TS）

| 形态 | TS kind / children | 实现 |
| --- | --- | --- |
| `export const|let|var x = 1;` | `VariableStatement`（diff 别名 `FirstStatement`）→ `ExportKeyword` + `VariableDeclarationList` | `ExportDeclarationPossibleShape` 走 Stage 13（见到 `;` 建），`StatementBuilder` 建变量语句后把 `ExportKeywordShape` 插到 `Data[0]` |
| `export class C {}` | `ClassDeclaration` → `ExportKeyword` + `Identifier` | Stage 10（类体 `{}` 关闭时建），`ClassDeclarationShape.FromUnits` + `ExportKeyword` |
| `export interface I {}` | `InterfaceDeclaration` → `ExportKeyword` + `Identifier` | Stage 11，同上 |
| `export enum E { A }` | `EnumDeclaration` → `ExportKeyword` + `Identifier` + `EnumMember` | Stage 12（枚举体允许非空），`EnumDeclarationShape.FromUnits` + `ExportKeyword` |
| `export default <表达式>;` | `ExportAssignment` → 表达式 | Stage 20/22（`;` 时建），`ExpressionBuilder` + `ExportAssignmentShape`；`isExportEquals=false` 不在比较字段里 |
| `export default class D {}` | `ClassDeclaration` → `ExportKeyword` + `DefaultKeyword` + `Identifier` | Stage 20→21（类体关闭时建），`ClassDeclarationShape.FromUnits` + 两个 modifier |

要点：
- 声明前缀形**不挂载 shell**：`BuildByIndex` 直接把根级声明形状（`built.Pos` 改成 `export` 前一个非 trivia 的
  `End+1`，`SignOut` 保持声明自己的右边界）splice 回宿主；`host.MountedUnit` 只在子句形（Stage 2）设置。
- 修饰词位置：`ExportKeyword.Pos` = `export` 前一个非 trivia 的 `End+1`（文件开头是 0）；
  `DefaultKeyword.Pos` = `export.End+1`，与 TS 一致。
- class / interface 的体非空时主动 `Reject`（成员未实现，不静默丢）；enum 体允许成员（`EnumDeclarationShape` 已实现）。
- `export default <表达式>` 在这里建 `ExportAssignmentShape`；**没有改** cover-module-1 的
  `export-assignment-*` 文件（该分支的类是空壳，够产生 kind/children/pos/end）。合并后 `export =` 仍由
  module-1 的 `ExportAssignmentPossibleShape` 负责，两边扫描互斥（`=` vs `default`），无冲突。

## 已被现有 62 条覆盖、本 chunk 未重复的形态

具名导出 `{…}`/`{…} from`、`export *`、`export * as ns from`、`export type {…}`/`export type * as ns`、
`with`/`assert` 属性段、关键字导出名、同文件多语句。

## 暂缓（写进 export.ts 注释目标）

- `export default function f() {}` —— 函数声明未合并（cover-declarations 侧）。
- `export declare class C {}` —— `declare` 修饰词在 declarations 侧；本 chunk 不扩。
- `export { "a-b" as c }` / `export { a as "b-c" }` —— 引号导出名；现有 `ExportSpecifierShape` 只认 `Common`，
  需要 StringLiteral 名字与 harness 侧 `name` 字段口径，留作后续。
- `export as namespace NS;` / `export = a;` —— cover-module-1 的文件（前者已合入 integration，后者进行中）。

## chunk 4 新增（base 10，全部逐条对拍 TS）

| 形态 | TS children | 实现 |
| --- | --- | --- |
| `export declare const x: number;` / `let y: string;` / `var z = 1;` | `VariableStatement` → `ExportKeyword` + `DeclareKeyword` + `VariableDeclarationList` | Stage 14→13（Kind 12）：`StatementBuilder` 从 `declare` 后那个 `const/let/var` 起建变量语句，再 unshift `DeclareKeyword` / `ExportKeyword`，整体 Pos 改到 `export` 前边界 |
| `export declare type T = A;` | `TypeAliasDeclaration` → `ExportKeyword` + `DeclareKeyword` + `Identifier` + `TypeReference` | Stage 14→13（Kind 13）：`TypeAliasDeclarationShape.FromUnits` 从 `type` 起建，再补两个修饰词 |
| `export { a as "b-c" } from "m";` / `export { "a-b" } from "m";` | `ExportSpecifier` → `Identifier`/`StringLiteral` + `StringLiteral` | `ExportSpecifierShape.FromTokens` 两个位置都接受 `Common` 或 `String`；harness `cjAst` 增一条最小 name 语义：`shape.Name.Text`（StringLiteralShape 的文本字段）→ `out.name`，`TS_KIND_ALIASES` 未动 |

暂缓：`export default class D extends B {}`（heritage 未合并：类声明形状报「类表达式缺少类体」）；
`export declare class/interface/enum`、`export default function`（属 chunk 3 分支，未并入本 base）；
`export default function*`；`export declare\ntype T = A;`（`declare` 与 `type` 之间换行时 TS 侧
TypeAliasDeclaration 的 pos 是 14 而不是 0，属 ruler 口径问题，留作后续）。
