# HANDOFF — impl-wp7c-10（WP-7 D-1 第五波：批次 5，声明类收尾）

STATUS: **COMPLETE** —— `export-declaration` 迁完；`SourceFileShape.CreateRules()` 改名收口完成；声明目录下已无 `*possible*.xl.md`。
BRANCH: `impl-wp7c-10`（本文件所在 commit 即交付点）
BASE: `impl-wp7c-9 @ 6b96b642`（possible 10 / xl 513 / AST 6167 / real-dts 226 / standard PASS）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-10`
未 merge、未 push。

## 0. 起点重建验证（本波第一步，自己实测）
新 clone 无 `dist/`、`build/` → `xl_build(force)` **512 written / 0 error / 1275 warning** →
`tsc` exit 0（3.4 s）→ `ast-json`/`ast-json-diff` **6167/6167、结构 0 / 位置 0 / 字段 0** →
`real-dts-ast` **226/226、崩溃 0**。与 wp7c-9 读数一致后才动手。

## 1. 本波交付

### 1.1 `export-declaration`（1312 行，最后一个声明级 possible）

| 原类 | 新类 | 原文件 |
|---|---|---|
| `ExportDeclarationPossibleShape` | `ExportDeclarationRule` | `declarations/export-declaration-possible-shape.xl.md`（1371 行含注释） |

四步（判据/建造函数体**逐字保留**，未动一个判断）：
1. `git mv declarations/export-declaration-possible-shape.xl.md declarations/export-declaration-rule.xl.md`；
   `# class ExportDeclarationPossibleShape extends PossibleShape` → `# class ExportDeclarationRule extends RootRule`。
2. import 换血（**import 行位置不变，行号 5、10 → 5**）：
   - `catalog-guide.xl.md` 那行 → `import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"`（原位第 5 行）
   - 删 `possible-shape.xl.md` 那行
   - `PossibleShapeCache` 保留（`ComputeByIndex` / `IsBuildable` 形参仍用它）
3. `BuildByIndex(..., catalog:CatalogGuide, ...)` → `table:RootRuleTable`，体内
   `catalog.PossibleShapesComputeCache` → `table.Cache`（1 处）。
4. `files/source-file-shape.xl.md` 的 import 行（第 14 行，位置不变）与 `new` 列表（第 191 行，**列表顺序未改**）同步改名。

**同类名限定调用（必做，否则 tsc 红）**：`ExportDeclarationPossibleShape.IsNewDeclarationAfterLineBreak`
2 处（原 374 / 441 行）→ `ExportDeclarationRule.IsNewDeclarationAfterLineBreak`。

另外 3 个文件的注释引用同步改名（纯文本，0 行为变化）：
`class-declaration-rule.xl.md`（1 处类名 + 1 处旧文件路径）、`export-assignment-rule.xl.md`（1 处类名）、
`namespace-export-declaration-rule.xl.md`（1 处类名）。

### 1.2 `CreatePossibleShapes` → `CreateRules` 收口改名（13 类全迁完才做，本波做）

`typescript/tokens/files/source-file-shape.xl.md`：
- `private static field CreatePossibleShapesCache` → `CreateRulesCache`（2 处引用同步）
- `static method CreatePossibleShapes:()=>Array<IRootRule>` → `CreateRules`
- 构造器里的调用 `SourceFileBodyItemHost.CreateRules(SourceFileShape.CreateRules())`

其余引用点（全部更新，顺序/语义不变）：
- `typescript/tokens/items/root-item-rule.xl.md`：3 处注释（`CreateRules()`）
- `typescript/tokens/items/root-rule-contract.xl.md`：`Rules` 字段注释去掉「迁移期仍是 `CreatePossibleShapes()`」
- `tests/body-drive/batch-split.mjs:234`：`SourceFileShape.CreateRules()`（**唯一非 .xl.md 调用点；不改它 batch-split 会红**）

`git grep -n "CreatePossibleShapes" -- '*.xl.md' '*.mjs'` → **0 命中**（只剩历史 `HANDOFF*.md` / `docs/*.md` 的历史叙述，故意不改）。

## 2. 门禁读数（本分支实测，清空 dist/build 后 force 重建）

| 项 | 读数 | 判定 |
|---|---|---|
| xl_build(force) | 512 written / 0 error / 1275 warning | PASS |
| tsc | exit 0（3.4 s） | PASS |
| ast-json (all) | 6167/6167，fail 0（47 构造） | PASS |
| ast-json-diff (all) | 完全一致 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts-ast | 文件 226 / 成功 226 / 崩溃 0 | PASS |
| body-drive item-oracle | 454 前缀全一致 | PASS |
| body-drive batch-split | 70 段 / 837 断言 / 0 失败 | PASS |
| body-drive stream-proof | PASS 146 / FAIL 0 | PASS |
| gates.ps1 -Tier standard | **RESULT: PASS**（13.1 s；tests/gates 1/8 基线已知红） | PASS |
| xl_check | 512 files / 0 error / 1275 warning | PASS |

## 3. 盘点（对比起点 6b96b642）

| 读数 | 起点 | 本分支 |
|---|---|---|
| `git ls-files 'typescript/tokens/declarations/*possible*.xl.md'` | 1 | **0** |
| `git ls-files '*possible*.xl.md'` | 10 | **9** |
| `git ls-files '*.xl.md'`（tracked） | 513 | **513**（纯改名，无增删） |
| `grep -l 'extends RootRule'` 的 .xl.md 文件数 | 10 | **11** |
| `git grep -lE 'PossibleShape|ComputePossibleShapes|CatalogGuide'`（.xl.md） | 53 | **53** |
| `git grep -l 'PossibleShape'`（.xl.md） | 46 | **46** |

剩余 9 个 `*possible*.xl.md`（**全部是本波写范围之外**）：

| # | 文件 | 归属 |
|---|---|---|
| 1 | `core/syntax/possible-shape.xl.md` | core（D-2） |
| 2 | `core/syntax/possible-shape-cache.xl.md` | core（D-2） |
| 3 | `core/syntax/i-compute-possible-shapes.xl.md` | core（D-2） |
| 4 | `core/syntax/compute-possible-shapes-states.xl.md` | core（D-2） |
| 5 | `typescript/tokens/statements/statement-possible-shape.xl.md` | 禁止（2 个 statement possible） |
| 6 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | 禁止（同上） |
| 7 | `typescript/tokens/keywords/class-keyword-possible-shape.xl.md` | 白名单 class-* |
| 8 | `typescript/tokens/expressions/class-expression-possible-shape.xl.md` | 白名单 class-* |
| 9 | `typescript/tokens/jsdoc/jsdoc-class-tag-possible-shape.xl.md` | 白名单 class-* |

即 **core 4 + statement 2 + 白名单 3 = 9**（起点 10 减 export 1）。
`grep -lE PossibleShape|ComputePossibleShapes|CatalogGuide` 仍是 53 个文件：因为全是 core 定义 + statement/白名单 里
对这些类型的正常依赖与注释，以及 `root-rule-contract` 里「暂时仍是 `PossibleShapeCache`」的迁移期说明（D-2 收口）。

## 4. 下一棒（D-2）的精确起点

起点：`.\tools\new-member.ps1 -Name impl-wp7d-1 -From impl-wp7c-10 -Base impl-wp7c-10`，先 force 重建 +
`gates.ps1 -Tier standard`（期望本文件 §2 读数）。
D-2 的目标是 `core/**`（本波禁止）：`possible-shape.xl.md`、`possible-shape-cache.xl.md`、
`i-compute-possible-shapes.xl.md`、`compute-possible-shapes-states.xl.md` 的改名/删除收口；
`PossibleShape.Slots` 与 `RootRule.Slots` 两套发号器合一、删 `RootRule.SlotBase` 与 `root-rule-contract`
里「暂时仍是 `PossibleShapeCache`」的说明，`RootRuleTable.Cache` 跟着换名（调用面不变）。
`statement-possible-shape` / `expression-statement-possible-shape` 与 3 个白名单 class-* 不在 D-1/D-2 内。

## 5. 坑（本波实测）

1. **`edit` 工具要求先 read 目标路径**：`git mv` 之后必须按**新路径**读一次，否则 `edit` 报
   「file has not been read」。旧路径读过不算。
2. 改名要覆盖**四类**引用：import 路径、`extends` 基类、类体内 `旧类名.静态方法` 限定调用、以及 **非 .xl.md 的测试调用点**
   （`tests/body-drive/batch-split.mjs` 的 `SourceFileShape.CreatePossibleShapes()`）。后两类 xl_build 都不报错。
3. 换 import 时保持**行位置**（catalog-guide 那行原地换成 root-rule-contract），这样与同批已迁的 10 个文件的
   import 顺序一致，diff 也最小。
4. `git grep` 数「含 PossibleShape 的文件」在本波**不会变**：被改名的是同一个文件（改名后仍 import
   `possible-shape-cache`），所以 46/53 两个读数与起点相同是正常的，进度看 `*possible*.xl.md` 计数。
5. 清 `dist/build` 仍必须做：否则 `export-declaration-possible-shape.ts` 旧产物会进 tsc，造成假绿。
6. pwsh 直接 `Get-Content` 读这些 .xl.md 会显示乱码（控制台按 ANSI 解码），**文件本身是 UTF-8**；
   要核对内容用 read 工具，核对编码用 `[IO.File]::ReadAllBytes` 数 BOM/CR（本波 8 个改动文件全部 `BOM=False CR=0`）。

## 6. 阻塞点
无。
