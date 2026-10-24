# HANDOFF — impl-wp7d-1（WP-7 D-2 第一波：core 协议删除 + legacy/shadow 清理）

STATUS: **PARTIAL** —— 阶段 A 全部完成并绿（commit `01083dd5`）；阶段 B / C / D 未开始（轮次用尽）。
BRANCH: `impl-wp7d-1` @ `01083dd5`（本 HANDOFF 另起一个 commit）
BASE: `impl-wp7c-10 @ 118ed539`
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7d-1`
未 merge、未 push。

## 0. 起点重建验证
新 clone 无 dist/build → 直接改代码 + `xl_build(force)`，阶段 A 落地后读数：
**512 written / 0 error / 1275 warning** → `tsc` exit 0（3.6 s）→ AST **6167/6167、0/0/0** →
real-dts **226/226、崩溃 0**。与 wp7c-10 §2 读数一致。

## 1. 阶段 A（完成，commit `01083dd5`）

### 1.1 core 4 个 possible 文件收口（4 删 4 增，xl 文件数 513 → 513 不变）

| 删除 | 新增 | 说明 |
|---|---|---|
| `core/syntax/possible-shape.xl.md` | `core/syntax/shape-rule.xl.md` | 类 `PossibleShape` → `ShapeRule`；删掉自带的 `Slots` / `SlotOf`，`Slot()` 改为 `ItemSlotCache.SlotOf(this.constructor)` |
| `core/syntax/possible-shape-cache.xl.md` | `core/syntax/item-slot-cache.xl.md` | 类 `PossibleShapeCache` → `ItemSlotCache`；**发号器搬到这里**（`Slots` + `SlotOf`），成为全仓唯一一套槽位；形参 `possibleShapeSlot` → `slot` |
| `core/syntax/i-compute-possible-shapes.xl.md` | `core/syntax/i-item-compute.xl.md` | 接口 `IComputePossibleShapes` → `IItemCompute`；`ComputePossibleShapes` → `ComputeItems`、`ComputePossibleShapesByIndex` → `ComputeItemsByIndex`（`CatalogGuide` 类型名本阶段保留，见阶段 C） |
| `core/syntax/compute-possible-shapes-states.xl.md` | `core/syntax/item-compute-states.xl.md` | 枚举 `ComputePossibleShapesStates` → `ItemComputeStates`（值不变：Nothing / Waiting / Built） |

### 1.2 单一槽位发号器（两套合一）
- `possible-shape.xl.md` 的 `Slots` / `SlotOf` 消失；
- `typescript/tokens/items/root-rule-contract.xl.md`：删 `RootRule.Slots` 与 **`RootRule.SlotBase = 100000`** 两节，
  `RootRule.SlotOf` 体内改成一行 `return ItemSlotCache.SlotOf(ruleClass);`；
- 现在 `RootRule.SlotOf`、`ShapeRule.Slot`、`RootRuleTable.Cache` 三处共用 `ItemSlotCache.Slots` 一张表，
  同一份缓存里不会再出现两套编号（wp7c-6 §DECISIVE FINDING 的撞槽问题从根上消失，数组也不再稀疏到 100000）。
- `RootRuleTable.Cache` 类型随类名改成 `ItemSlotCache`（字段名 `Cache` 未动，调用面不变）。

### 1.3 全仓机械改名（44 + 41 个文件，纯字面量替换，判据/建造函数体一字未动）
`item-slot-cache.xl.md` / `shape-rule.xl.md` / `i-item-compute.xl.md` / `item-compute-states.xl.md` 的
import 路径与符号：`ItemSlotCache` 24 文件、`ItemComputeStates` 17、`IItemCompute` 15、`ComputeItems*` 19、
`\bPossibleShape\b`→`ShapeRule` 29、`PossibleShapes`→`Shapes`（`CatalogGuide` 字段）、
`PossibleShapesComputeCache`→`SlotCache`（`CatalogGuide` 字段）。
`tests/bench/slot-micro.mjs` / `dts-cost-probe.mjs` 的 require 路径与类名同步（未跑，但不该再 MODULE_NOT_FOUND）。

### 1.4 盘点（本分支实测）
| 读数 | 起点 118ed539 | 本分支 01083dd5 |
|---|---|---|
| `git ls-files '*possible*.xl.md'` | 9 | **5**（statement 2 + 白名单 3） |
| `git ls-files '*.xl.md'` | 513 | 513 |
| `git grep -lE 'ComputePossibleShapes' -- '*.xl.md'` | 19 文件 | **0** |
| `git grep -lE 'PossibleShape' -- '*.xl.md'` | 46 文件 | 22 文件 / 116 命中（= 5 个类名 + 其调用点） |
| `git grep -lE 'CatalogGuide' -- '*.xl.md'` | 36 文件 | 35 文件 / 93 命中（阶段 B/C 未动） |
| `grep -l possible-shape core/**` | 4 | **0** |

## 2. 门禁读数（本分支，force 重建后）
| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build(force) | tool，core+typescript → dist | 512 written / **0 error** / 1275 warning | PASS |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 / 3.59 s | PASS |
| AST 子集 | `ast-json[-diff] expression statements members` | 1214/1214；0/0/0 | PASS |
| AST 全量 | `ast-json[-diff]` | 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts | `real-dts-ast.mjs` | 226/226；崩溃 0 | PASS |
| item-oracle | `tests/body-drive/item-oracle.mjs` | 454 前缀全一致 | PASS |
| batch-split | `tests/body-drive/batch-split.mjs` | 70 段 / 837 断言 / 0 失败 | PASS |
| stream-proof | `tests/body-drive/stream-proof.mjs` | PASS 146 / FAIL 0 | PASS |
| gates.ps1 -Tier standard | — | **RESULT: PASS**（12.8 s；tests/gates 1/8 基线已知红） | PASS |
| xl_check | tool | 512 files / 0 error / 1275 warning | PASS |

## 3. 未完成项（阶段 B / C / D）

### 阶段 B（UnitToken/BatchMode/legacy/shadow）—— 一处都没动
起点事实（本波已盘点，接任者可直接下手）：
1. `core/syntax/unit-token.xl.md`：`## field CatalogGuide`（约 45-60 行区间）与 `IItemCompute` 的
   `property CatalogGuide`；`if (context.BatchMode === 0 || this.BatchAdapter === null)`（约 72 行）。
2. `core/syntax/token.xl.md`：`OnBasicTokenClosed` 里 `BatchMode=0` 的 legacy 兜底 + `CatalogGuide` 判空（约 118-140 行）。
3. 9 个 basic token 的 `CatalogGuide` import：`area-annotation` / `bom` / `bracket` / `common` /
   `line-annotation` / `regex-token` / `shebang` / `string/string` / `symbol`（它们同时 import
   `IItemCompute` 与 `ItemComputeStates`，**只删 CatalogGuide 那一行**，其余两条别动）。
4. `BatchMode` 分支：`unit-token:72`、`typescript/run/statement-block-stream.xl.md:54`、
   `typescript/tokens/statements/statement-builder.xl.md:1231/1236/1247/1258/2185/2187/2197`。
5. 待删文件：`core/syntax/batch/legacy-batch-adapter.xl.md`、`core/syntax/batch/shadow-compare.xl.md`；
   连带 `core/syntax/syntax-context.xl.md` 的 `field BatchMode:int = 1`、`field Shadow:ShadowCompare | null`
   两节与 import，以及 `i-batch-host.xl.md:16-17` 的 legacy 叙述。
6. **删完必须**：`Remove-Item -Recurse -Force dist,build` → `xl_build(force)` → tsc，否则旧产物假绿；
   `xl_orphans(prune:true)` 清掉两个已删产品的 xl 缓存。

### 阶段 C（剩余 5 个 possible + `CatalogGuide` 改名）
- 5 个文件与类名（都仍 `extends ShapeRule`，判据体一字不动，纯改名）：
  `statement-possible-shape` / `expression-statement-possible-shape` / `class-keyword-possible-shape` /
  `class-expression-possible-shape` / `jsdoc-class-tag-possible-shape`。
- `CatalogGuide`（35 文件 / 93 命中）仍匹配目标 grep。它**不能删**（statement-scanner / statement-builder /
  source-file-tail-builder / 各声明 shape 都还在用），只能改名（建议 `ShapeCatalog`，文件
  `core/syntax/catalog-guide.xl.md` → `shape-catalog.xl.md`），字段名已经在本波改成 `Shapes` / `SlotCache`。
- 目标：`git grep -lE 'PossibleShape|ComputePossibleShapes|CatalogGuide|LegacyBatchAdapter|ShadowCompare' -- '*.xl.md'` = **0**。

### 阶段 D
清 dist/build → `xl_build(force)` → tsc → AST 6167/0/0/0 → real-dts 226 → body-drive 三件 →
`gates.ps1 -Tier standard` + `-Tier full`（WAIVED 记录）→ `xl_check` 0 error；xl 文件数预期 ~490。

## 4. 下一棒的精确命令
```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp7d-2 -From impl-wp7d-1 -Base impl-wp7d-1
cd impl-wp7d-2
# 先核对：xl_build(force) + tsc + ast-json-diff 应为本文件 §2 读数（512 files / 6167 / 0/0/0）
# 然后按 §3 阶段 B → C → D 逐段做，每段绿才 commit
```

## 5. 坑（本波实测，接任者必看）
1. **批量改名的顺序陷阱**：`ComputePossibleShapes` 必须排在 `ComputePossibleShapesStates` /
   `ComputePossibleShapesByIndex` **之后**，`PossibleShapesComputeCache` 必须排在 `PossibleShapes` 之前，
   否则会得到 `IComputeItems` / `ComputeItemsStates` / `SlotCacheComputeCache` 这类残废名。
   （本波第一次就栽在 `IComputePossibleShapes` 上，xl 报 50 个 E1006。）
2. **`\bPossibleShape\b` 不覆盖 `PossibleShapeCache`**（后面接 `Cache` 不是词边界）——两个名字要各写一条。
3. **文件名子串陷阱**：把 `possible-shape\.xl\.md` 当正则全局替换会命中
   `expression-statement-possible-shape.xl.md`、`source-file-end-possible-shape.xl.md` 等更长文件名，
   把 import 路径改成不存在的 `...-shape-rule.xl.md`。正确做法：先替长名，或只替 `\./possible-shape\.xl\.md`
   这类带边界的形式。本波已经修回（当前 0 dangling import，校验脚本见下）。
4. **dangling import 自检**（比 xl_build 的报错早一步，输出小）：
   ```powershell
   $root=(Get-Location).Path; $rx=[regex]'from\s+"([^"]+\.xl\.md)"'; $miss=@()
   foreach ($f in (Get-ChildItem -Path core,typescript -Recurse -File -Include *.xl.md)) {
     foreach ($m in $rx.Matches([IO.File]::ReadAllText($f.FullName))) {
       if (-not (Test-Path -LiteralPath (Join-Path $f.DirectoryName $m.Groups[1].Value))) { $miss += $f.FullName }
     } }
   "MISSING: $($miss.Count)"; $miss | Sort-Object -Unique
   ```
5. **xl_build 的警告串会把工具输出撑到 100KB+**，`-Force` 重建一次即可，别在同一轮里反复跑；用
   `Select-Object -Last N` 过滤 tsc / 套件输出。
6. `pwsh` 里写 `[regex]`、`@'...'@` here-string 时**别用双引号包反引号的代码块**（PS 会把反引号当转义），
   代码块一律用单引号 here-string。
7. 遗留文本瑕疵（不影响门禁，纯粹是历史叙述）：`root-rule-contract.xl.md` 的 `RootRuleTable.Cache` 段仍写着
   「缓存类型**暂时**仍是 `ItemSlotCache`…D-2 把 `possible-shape-cache` 改名收口」，以及
   `member-item-util` / `enum-member-item-util` / `source-file-tail-builder` 的注释把历史文件名写成了
   `...-shape-rule.xl.md`；stage C 收口时顺手改掉。

## 6. 阻塞点
无。
