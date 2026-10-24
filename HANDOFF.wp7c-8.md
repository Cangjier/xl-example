# HANDOFF — impl-wp7c-8（WP-7 D-1 第四波：批次 3）

STATUS: **PARTIAL** —— 批次 3（import-declaration + class-declaration）完成并全绿；批次 4..N 未开始（轮次预算）。
BRANCH: `impl-wp7c-8`
BASE: `impl-wp7c-7 @ 8b177aa6`（possible 14 / xl 513 / AST 6167 / real-dts 226 / standard PASS）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-8`
未 merge、未 push。

## 0. 起点重建验证（本波第一步，自己实测）
新 clone 无 `dist/`、`build/` → `xl_build(force)` **512 written / 0 error / 1275 warning** →
`gates.ps1 -Tier standard` **RESULT: PASS**（AST 6167/6167、结构 0 / 位置 0 / 字段 0；real-dts 226/226、崩溃 0）。
与 wp7c-7 §2 读数一致后才动手。

## 1. 本波交付（2 类，一个 commit；两类同批改完一起重建，故未拆两类 commit）

| 原类 | 新类 | 原文件行数 |
|---|---|---|
| `ImportDeclarationPossibleShape` | `ImportDeclarationRule` | 183 |
| `ClassDeclarationPossibleShape` | `ClassDeclarationRule` | 234 |

每类严格四步（判据/建造函数体**逐字保留**，未动一个判断）：
1. `git mv declarations/xxx-possible-shape.xl.md declarations/xxx-rule.xl.md`；`# class XxxRule extends RootRule`。
2. import 换血：删 `core/syntax/catalog-guide.xl.md` 与 `core/syntax/possible-shape.xl.md` 两行，
   换成 `import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"`；`PossibleShapeCache` 保留（ComputeByIndex/IsBuildable 形参仍用它）。
3. `BuildByIndex(..., catalog:CatalogGuide, ...)` → `table:RootRuleTable`，体内 `catalog.PossibleShapesComputeCache` → `table.Cache`（每文件仅 1 处）。
4. `files/source-file-shape.xl.md` 的 import 行与 `new` 列表同步改名；列表**顺序未改**。
   **class-declaration 的 `BuildByIndex` 仍走 `BodyGuideUtil.MountShell`，函数体逐字未动**（含 `host.Data.splice` / `MountedUnit` 语义）。

另外 4 个文件的注释/路径引用同步改名（纯文本，0 行为变化）：
`class-declaration-shape.xl.md`（1 处类名）、`import-equals-declaration-rule.xl.md`（1 处类名）、
`enum-declaration-possible-shape.xl.md`（1 处路径）、`items/source-file-tail-builder.xl.md:717`（wp7c-7 遗留的 `function-declaration-possible-shape` 注释路径）。

## 2. 门禁读数（本分支实测，清空 dist/build 后 force 重建）

| 项 | 读数 | 判定 |
|---|---|---|
| xl_build(force) | 512 written / 0 error / 1275 warning | PASS |
| tsc | exit 0（gates 内建） | PASS |
| ast-json (all) | total 1214/1214，fail 0 | PASS |
| ast-json-diff (all) | 完全一致 1214/1214；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts-ast | 文件 226 / 成功 226 / 崩溃 0 | PASS |
| gates.ps1 -Tier standard | RESULT: PASS（tests/gates 1/8 基线已知红） | PASS |
| xl_check | 512 files / 0 error / 1275 warning | PASS |

## 3. 盘点（对比起点 8b177aa6）

| 读数 | 起点 | 本分支 |
|---|---|---|
| `git ls-files 'typescript/tokens/declarations/*possible*.xl.md'` | 5 | **3** |
| `git ls-files '*possible*.xl.md'`（含 core 4 / statement 2 / 白名单 3） | 14 | **12** |
| `git ls-files '*.xl.md'`（tracked） | 513 | **513**（纯改名，无增删） |
| 已迁移类（root 规则） | 6 | **8** |
| 含 `PossibleShape` 的 .xl.md 文件数 | — | 47 |

剩余 3 个声明级 possible（按行数）：`interface-declaration` 242、`enum-declaration` 244、`export-declaration` 1312（最后）。

## 4. 下一批（impl-wp7c-9）的精确切法

起点：`.\tools\new-member.ps1 -Name impl-wp7c-9 -From impl-wp7c-8 -Base impl-wp7c-8`，先 force 重建 + standard（本文件 §2 读数）。
批次 4 建议 = `interface-declaration`（242）+ `enum-declaration`（244），四步完全同上；
`enum-declaration` 的 import 列表可能仍含 `CatalogGuide` / `PossibleShape`，按同样两行删除 + `BuildByIndex` 两处替换。
`export-declaration`（1312）单独一批，最后做。
`SourceFileShape.CreatePossibleShapes()` → `CreateRules():Array<IRootRule>` 的收口改名，仍等 13 条全迁完再做（别提前）。

## 5. 坑（本波实测新增）

1. `source-file-tail-builder.xl.md` 在 `typescript/tokens/items/` 下（不是 `files/`）；查旧注释路径前先 `git ls-files '*source-file-tail-builder*'`，否则整批替换脚本会在最后一个文件上抛异常（本波踩到，前 20 处替换已生效、后处理被跳过，补跑一次即可，无副作用）。
2. 两类一起改完再重建时，`xl_build` 不报旧文件残留；但 **清空 dist/build 仍必须做**（否则 `*-possible-shape.ts` 旧产物进 tsc 是假绿温床）。
3. 用 pwsh 批量改写 .xl.md 时，`[IO.File]::ReadAllText/WriteAllText` + `New-Object System.Text.UTF8Encoding(False)` 可保 LF 无 BOM；
   本波 4 个文件实测 `BOM=False CR=0`。
4. `git grep` 计数时 `PossibleShape` 仍会命中未迁移的 3 个声明级类、statement 两类与 core 定义，属预期；看进度请看 §3 的 `*possible*.xl.md` 计数。

## 6. 阻塞点

无。剩余全是同类机械迁移，四条落点已固化为「改 1 行继承 + 2 行 import + 2 处 BuildByIndex」。