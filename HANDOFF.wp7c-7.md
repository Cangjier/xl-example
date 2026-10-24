# HANDOFF — impl-wp7c-7（WP-7 D-1 第三波：批次 2）

STATUS: **PARTIAL** —— 批次 2（4 个声明级类）已完成并全绿；批次 3..N 未开始（轮次预算）。
BRANCH: `impl-wp7c-7`
BASE: `impl-wp7c-6 @ b091f59c`（possible 18 / xl 513 / AST 6167 / real-dts 226 / standard PASS）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-7`
未 merge、未 push。

## 0. 起点重建验证（本波第一步，自己实测）
新 clone 无 `dist/`、`build/`（gitignore）→ `xl_build(force)` **512 written / 0 error / 1275 warning** → `gates.ps1 -Tier standard` **RESULT: PASS**
（AST 6167/6167、结构 0 / 位置 0 / 字段 0；real-dts 226/226、崩溃 0）。与 wp7c-6 读数一致后才动手。

## 1. 本波交付（4 类，一个 commit）

| 原类 | 新类 | 原文件行数 |
|---|---|---|
| `ImportEqualsDeclarationPossibleShape` | `ImportEqualsDeclarationRule` | 396 |
| `ModuleDeclarationPossibleShape` | `ModuleDeclarationRule` | 293 |
| `FunctionDeclarationPossibleShape` | `FunctionDeclarationRule` | 443 |
| `TypeAliasDeclarationPossibleShape` | `TypeAliasDeclarationRule` | 458 |

每类严格四步（判据/建造函数体**逐字保留**，未动一个判断）：
1. `git mv declarations/xxx-possible-shape.xl.md declarations/xxx-rule.xl.md`；`# class XxxRule extends RootRule`。
2. import 换血：删 `core/syntax/possible-shape.xl.md` 与 `core/syntax/catalog-guide.xl.md` 两行，
   换成 `import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"`；`PossibleShapeCache` 保留（ComputeByIndex/IsBuildable 形参仍用它）。
3. `BuildByIndex(host, tokenIndex, catalog:CatalogGuide, ...)` → `table:RootRuleTable`，体内 `catalog.PossibleShapesComputeCache` → `table.Cache`（每文件仅 1 处）。
4. `files/source-file-shape.xl.md` 的 import 行与 13 条 `new` 里的类名/路径同步；13 条**顺序未改**（root 靠 Winner 下标喂 `BuildByKind`）。

另外 6 个文件的注释/路径引用同步改名（纯文本，0 行为变化）：`export-assignment-rule`、`namespace-export-declaration-rule`、
`module-block-shape`、`expression-statement-possible-shape`、`statement-builder`、`statement-scanner`。

## 2. 门禁读数（本分支实测，清空 dist/build 后 force 重建）

| 项 | 读数 | 判定 |
|---|---|---|
| xl_build(force) | 512 written / 0 error / 1275 warning | PASS |
| tsc | exit 0 | PASS |
| ast-json (all) | 6167/6167 | PASS |
| ast-json-diff (all) | 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts-ast | 226 files / 226 ok / 崩溃 0 | PASS |
| gates.ps1 -Tier standard | RESULT: PASS（13.3 s；`tests/gates` 1/8 基线已知红） | PASS |
| xl_check | 512 files / 0 error / 1275 warning | PASS |

## 3. 盘点（对比起点 b091f59c）

| 读数 | 起点 | 本分支 |
|---|---|---|
| `git ls-files 'typescript/tokens/declarations/*possible*.xl.md'` | 9 | **5** |
| `git ls-files '*possible*.xl.md'`（含 core 4 / statement 2 / 白名单 3） | 18 | **14** |
| `git ls-files '*.xl.md'`（tracked） | 513 | **513**（纯改名，无增删） |
| 已迁移类（root 规则） | 2 | **6** |

剩余 5 个声明级 possible（按行数）：`import-declaration` 176、`class-declaration` 211、`interface-declaration` 242、
`enum-declaration` 244、`export-declaration` 1312（最后）。

## 4. 下一批（impl-wp7c-8）的精确切法

起点：`.\tools\new-member.ps1 -Name impl-wp7c-8 -From impl-wp7c-7 -Base impl-wp7c-7`，先 force 重建 + standard（本文件 §2 读数）。
建议批次 3 = `import-declaration`（176）+ `class-declaration`（211），两步四步完全同上；
注意 `ClassDeclarationPossibleShape.BuildByIndex` 走 `BodyGuideUtil.MountShell`（会改 `host.MountedUnit` 并替换 `host.Data`）——
**函数体逐字保留**，只换形参类型与 `table.Cache`。

`SourceFileShape.CreatePossibleShapes()` → `CreateRules():Array<IRootRule>` 的收口改名，仍等 13 条全迁完再做（别提前）。

## 5. 坑（本波实测新增）

1. **改名必须同时改 import 路径**：只换类名 token 会让 `source-file-shape.xl.md` 里 `from "./declarations/xxx-possible-shape.xl.md"` 悬空。
   做法：类名替换 + `"-possible-shape.xl.md"` → `"-rule.xl.md"` 一起做。
2. **一次删掉整个 `dist/` 与 `build/`** 比逐个删 8 个陈旧产物更稳（本波就是这么做的，force 重建 512 全量），
   这样绝不会出现「tsc 编译了旧 .ts」的假绿。
3. 用 pwsh 批量改写 .xl.md 时，`[IO.File]::ReadAllText/WriteAllText` + `New-Object System.Text.UTF8Encoding($false)` 可保 LF 无 BOM；
   改完逐个核对 `BOM=False CR=False`（4 个文件均通过）。
4. 残留：`source-file-tail-builder.xl.md:717` 的注释仍写 `function-declaration-possible-shape`（无 `.xl.md` 后缀，路径替换没覆盖到）——纯注释，
   下一批重建时顺手改掉即可。
5. `git grep` 计数时 `PossibleShape` 仍会命中未迁移的 5 个类与 statement 两类，属预期；看进度请看 §3 的 `*possible*.xl.md` 计数。

## 6. 阻塞点

无。剩余全是同类机械迁移，四条落点已固化为「改 1 行继承 + 2 行 import + 2 处 BuildByIndex」。
