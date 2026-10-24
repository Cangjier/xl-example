# HANDOFF — impl-wp7c-9（WP-7 D-1 第四波：批次 4）

STATUS: **PARTIAL** —— 批次 4（interface-declaration + enum-declaration）完成并全绿；批次 5（export-declaration）未开始。
BRANCH: `impl-wp7c-9` （本文件所在 commit 即交付点）
BASE: `impl-wp7c-8 @ 0eb8bfaf`（possible 12 / xl 513 / AST 6167 / real-dts 226 / standard PASS）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-9`
未 merge、未 push。

## 0. 起点重建验证（本波第一步，自己实测）
新 clone 无 `dist/`、`build/` → `xl_build(force)` **512 written / 0 error / 1275 warning** →
`tsc` exit 0 → `ast-json`/`ast-json-diff` **6167/6167、结构 0 / 位置 0 / 字段 0** →
`real-dts-ast` **226/226、崩溃 0**。与 wp7c-8 读数一致后才动手。

## 1. 本波交付（2 类，一个 commit；两类同批改完一起重建，故未拆两类 commit）

| 原类 | 新类 | 原文件行数 |
|---|---|---|
| `InterfaceDeclarationPossibleShape` | `InterfaceDeclarationRule` | 255 |
| `EnumDeclarationPossibleShape` | `EnumDeclarationRule` | 264 |

每类严格四步（判据/建造函数体**逐字保留**，未动一个判断）：
1. `git mv declarations/xxx-possible-shape.xl.md declarations/xxx-rule.xl.md`；`# class XxxRule extends RootRule`。
2. import 换血：删 `core/syntax/catalog-guide.xl.md` 与 `core/syntax/possible-shape.xl.md` 两行，
   换成 `import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"`；`PossibleShapeCache` 保留
   （ComputeByIndex/IsBuildable 形参仍用它）。
3. `BuildByIndex(..., catalog:CatalogGuide, ...)` → `table:RootRuleTable`；体内
   `catalog.PossibleShapesComputeCache` → `table.Cache`（每文件 1 处）。
4. `files/source-file-shape.xl.md` 的 import 行与 `new` 列表同步改名；**列表顺序未改**（含 3 处被注释的旧行）。
   **enum 的 `BuildByIndex` 仍走 `BodyGuideUtil.MountShell`，函数体逐字未动**（MountShell 2 处：注释 + 调用）。

### 1.1 额外的「同类名代码引用」修正（本波新发现，必须做）
改名后类体内仍有对**自身私有静态方法**的限定调用，不改 tsc 必红：
- `interface-declaration-rule.xl.md`：`InterfaceDeclarationPossibleShape.HasLineBreakBefore` → 新类名（1 处）
- `enum-declaration-rule.xl.md`：同上（2 处）
另外 3 个文件的注释/文档串同步改名（纯文本，0 行为变化）：
`body-guide-util.xl.md`（2 处）、`interface-declaration-shape.xl.md`（1 处）、`enum-declaration-shape.xl.md`（1 处）。

## 2. 门禁读数（本分支实测，清空 dist/build 后 force 重建）

| 项 | 读数 | 判定 |
|---|---|---|
| xl_build(force) | 512 written / 0 error / 1275 warning | PASS |
| tsc | exit 0（gates 内建） | PASS |
| ast-json (all) | 6167/6167，fail 0 | PASS |
| ast-json-diff (all) | 完全一致 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts-ast | 文件 226 / 成功 226 / 崩溃 0 | PASS |
| gates.ps1 -Tier standard | RESULT: PASS（tests/gates 1/8 基线已知红） | PASS |
| xl_check | 512 files / 0 error / 1275 warning | PASS |

## 3. 盘点（对比起点 0eb8bfaf）

| 读数 | 起点 | 本分支 |
|---|---|---|
| `git ls-files 'typescript/tokens/declarations/*possible*.xl.md'` | 3 | **1** |
| `git ls-files '*possible*.xl.md'`（含 core 4 / statement 2 / 白名单 3） | 12 | **10** |
| `git ls-files '*.xl.md'`（tracked） | 513 | **513**（纯改名，无增删） |
| 已迁移类（root 规则） | 8 | **10** |
| 含 `PossibleShape` 的 .xl.md 文件数 | 47 | 46 |

剩余声明级 possible **1 个**：`export-declaration-possible-shape.xl.md`（1312 行，最后做）。

## 4. 下一批（impl-wp7c-10）的精确切法
起点：`.\tools\new-member.ps1 -Name impl-wp7c-10 -From impl-wp7c-9 -Base impl-wp7c-9`，先 force 重建 + standard（本文件 §2 读数）。
批次 5 = `export-declaration`（1312，单批），四步完全同上；**另外必须 grep 同类名限定调用**
（`ExportDeclarationPossibleShape.xxx`）一并改名，否则 tsc 红。
`SourceFileShape.CreatePossibleShapes()` → `CreateRules():Array<IRootRule>` 的收口改名，等 export 迁完再做。

## 5. 坑（本波实测新增）
1. **`[IO.File]::ReadAllText/WriteAllText` 的相对路径按「进程工作目录」解析，不是 PowerShell 的 `Set-Location`**。
   在 clone 里 `Set-Location` 后用相对路径读写，会去 harness 的 cwd（`...\xl-example`）找文件 → FileNotFound，
   `` 变 ``，随后 `WriteAllText` 把目标写成**空文件**（本波踩到，两个 .xl.md 被清空；
   靠 `git checkout -- <新路径>` 从 index 取回原文才恢复）。**一律用 `Join-Path  ` 的绝对路径。**
2. 改名要覆盖**三类**引用：import 路径、`extends` 基类、类体内 `旧类名.静态方法` 限定调用（后者最容易漏，xl_build 不报错、tsc 才红）。
3. `gates.ps1 -Tier standard` 本身就含 tsc + 全量 AST + real-dts；单独再跑一遍 ast-json 是重复的，只跑 gates 即可。
4. `git grep` 计数时 `PossibleShape` 仍会命中未迁移的 export-declaration、statement 两类与 core 定义，属预期；
   看进度看 §3 的 `*possible*.xl.md` 计数。
5. `docs/*.md` 里仍有旧路径/旧类名的历史引用（设计文档，非代码），本波**未改**（不在写范围）。

## 6. 阻塞点
无。剩余 1 类（export-declaration）是同套机械迁移，落点已固化为「1 行继承 + 2 行 import + 2 处 BuildByIndex + N 处同类名限定调用」。