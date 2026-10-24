# HANDOFF — impl-wp7c-5（WP-7 D-1 第一波：root 规则契约）

STATUS: **PARTIAL** —— D-1 的**第 1 步（契约定义）已落地并全绿**；逐类迁移未开始（0 个类迁移）
BRANCH: `impl-wp7c-5` @ `5df342e2`（代码）+ 本文件所在 docs commit
BASE: `impl-wp7c-4 @ 7ab3f857`
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-5`
未 merge、未 push。

## 0. 起点重建验证（本轮第一步，自己实测）

`impl-wp7c-4` 的 clone 里本来就没有 `dist/` / `build/`（都 gitignore），所以「清残留」天然满足。
`xl_build(force)` → **511 written / 0 error** → tsc exit 0 → `gates -Tier standard` → **RESULT: PASS**
（AST 6167/6167、结构 0 / 位置 0 / 字段 0；real-dts 226/226、崩溃 0）。
与 `HANDOFF.wp7c-4.md` §3 读数一致，基线绿后才动手。

## 1. 本轮交付（一个代码 commit `5df342e2`）

**新增 `typescript/tokens/items/root-rule-contract.xl.md`（零行为改动，纯新增）**

- `# interface IRootRule`：只有三条 —— `Slot():int`、
  `ComputeByIndex(units, tokenIndex, cache):ShapeStates`、
  `IsBuildable(units, tokenIndex, cache, context):bool`。
  **没有 possible 语义，没有 `CatalogGuide` 形参，也没有 `BuildByIndex`。**
- `# class RootRule`：只给槽位分配（`RootRule.Slots` / `SlotOf` / `Slot`），
  从 `PossibleShape` 搬出来的规则类改继承它即可，判据与建造代码一字不动。
- `# class RootRuleTable`：`Rules:Array<IRootRule>` + `Cache:PossibleShapeCache` + `Count` / `At` / `Reset`，
  扮演 `CatalogGuide` 在根上的**那两项职责**（候选数组 + 判定缓存），但不认领候选、不淘汰、不挂 `EndPossible`。

## 2. 决定性发现（本轮最值钱的一条，直接决定下一棒怎么切）

### 2.1 契约**故意不含 `BuildByIndex`**，这就是「可以逐类迁移」的杠杆

`root-item-rule.xl.md` 对候选只调**两**类成员：

| 行 | 调用 | 用途 |
|---|---|---|
| 246 | `Guide.PossibleShapes[index].ComputeByIndex(units, hostAt, cache)` | 淘汰候选（判前缀） |
| 243 附近 | `IsBuildable(units, index, cache, context)` | 「试建」前的门 |
| 379 | `Guide.PossibleShapes[only]` → 仅取下标喂 `BuildByKind` | **不调 `BuildByIndex`** |

`root-item-rule.xl.md:997-1003` 自己写着：建造按族分派到**静态入口**（`BuildByKind`），
「**不是** `BuildByIndex`：class/interface/enum 的 `BuildByIndex` 走 `BodyGuideUtil.MountShell`，
会改 `host.MountedUnit` 并替换 `host.Data`」。全文件 **0 处** `BuildByIndex(` 调用。

→ 所以契约**不声明** `BuildByIndex`。代价为零（根引擎本来不调），收益是：
`PossibleShape` 的 `Slot` / `ComputeByIndex` / `IsBuildable` 与 `IRootRule` **逐字同签名**，
**每一个既有 `XxxPossibleShape` 都结构化满足 `IRootRule`**。
于是迁移可以是「一半 `IRootRule`、一半 `PossibleShape`」的中间态而**类型仍然正确**：
不必一次性重写 13 个候选，也不必先动 `core/`（D-2 的禁区）。
这是把 D-1 从「原子大爆炸」拆成「可逐类 commit」的关键，任务书没写、wp7c-1 §3.1 也没写。

### 2.2 `Guide` 不能直接删：它同时是**缓存持有者**

`root-item-rule` 里 `Guide` 只有 5 个真实使用点（其余是注释）：

| 行 | 代码 | 迁移后的落点 |
|---|---|---|
| 67 | `## field Guide:CatalogGuide` | → `## field Table:RootRuleTable` |
| 117/122 | `constructor:(shapes:Array<PossibleShape>)` / `this.Guide = new CatalogGuide(shapes, null)` | → `new RootRuleTable(shapes)`（`shapes` 形参类型改 `Array<IRootRule>`） |
| 133 | `this.Guide.PossibleShapes.length` | → `this.Table.Count()` |
| 143 | `this.Guide.PossibleShapesComputeCache.Clear()` | → `this.Table.Reset()` |
| 191 | `const cache: PossibleShapeCache = this.Guide.PossibleShapesComputeCache` | → `this.Table.Cache` |
| 246 | `this.Guide.PossibleShapes[index].ComputeByIndex(...)` | → `this.Table.At(index)!.ComputeByIndex(...)` |
| 379 | `const shape: PossibleShape = this.Guide.PossibleShapes[only]` | → `const shape: IRootRule = this.Table.At(only)!` |

**只换类型与取法，不动一行判定**；`CatalogGuide` 在根上彻底消失，但 `core/` 一个字节不改。
`ComputePossibleShapes` / `PossibleShapesComputeCache` 这些名字只在 `core/` 里活着，等 D-2 收。

## 3. 盘点：14 个声明级 possible 的真实清单

`git ls-files '*possible*.xl.md'` = **20**（本轮未变），拆开：

| 数 | 文件 | 行数 | 归属 |
|---|---|---|---|
| 11 | `declarations/class-declaration` | 211 | 根候选（`CreatePossibleShapes` 活体） |
| | `declarations/enum-declaration` | 244 | 同上 |
| | `declarations/export-assignment` | 152 | 同上 |
| | `declarations/export-declaration` | **1312** | 同上（最大，放最后） |
| | `declarations/function-declaration` | 443 | 同上 |
| | `declarations/import-declaration` | 176 | 同上 |
| | `declarations/import-equals-declaration` | 396 | 同上 |
| | `declarations/interface-declaration` | 242 | 同上 |
| | `declarations/module-declaration` | 293 | 同上 |
| | `declarations/namespace-export-declaration` | 137 | 同上（最小） |
| | `declarations/type-alias-declaration` | 458 | 同上 |
| 2 | `statements/statement-possible`（含 `*Scan` 判据主体）、`statements/expression-statement-possible`（`IsStatementBoundaryAfterExpression` 被多个声明 possible 反向依赖） | — | **不删**（`StatementScanner/Builder` 的判据主体） |
| 3 | 白名单：`expressions/class-expression`、`jsdoc/jsdoc-class-tag`、`keywords/class-keyword` | — | **不删** |
| 4 | `core/syntax/{possible-shape, possible-shape-cache, i-compute-possible-shapes, compute-possible-shapes-states}`（`catalog-guide` 名字里没有 `possible`，算第 5 个） | — | D-2 |

任务书说「14 个声明级」：11 个在 `declarations/` + 2 个 statement 判据 + 1 个（`string-literal-possible`，wp7c-3 已删）
= 对不上；**实际可迁的声明级就是 11 个**，以本节表为准。

`SourceFileShape.CreatePossibleShapes()`（`files/source-file-shape.xl.md:185-231`）里**活体 13 条**，
顺序即竞争顺序，迁移时**不得改顺序**（`root-item-rule` 用 `Winner` 下标喂 `BuildByKind` 的 kind，
kind 表见 `root-item-rule.xl.md:837-838`：1 import / 2 export 子句 / 3 class / 4 interface / 5 enum /
6 function / 7 module / 8 type alias / 9 语句 / 10 export 赋值 / 11 import equals）。

## 4. 下一棒（`impl-wp7c-6`）的精确切法

### 批次 0（半轮，接线，必须先做一次）：把根切到 `RootRuleTable`

只改 `root-item-rule.xl.md` + `source-file-shape.xl.md:48` 的构造调用，按 §2.2 的 6 个落点替换，
13 个候选**一个都不动**（全部仍是 `PossibleShape`，结构化满足 `IRootRule`）。
`CreatePossibleShapes()` **本轮不改名**（改名放到 13 个类都迁完之后，避免同批做两件事）。
全量门禁绿 → commit。这一批绿了，后面每一批就只剩「改一个文件 + 删一个文件」。

### 批次 1…N（每 2–3 类一 commit，建议按行数从小到大）

1. `namespace-export-declaration`（137）+ `export-assignment`（152）—— 两个最独立
2. `import-declaration`（176）+ `class-declaration`（211）
3. `interface-declaration`（242）+ `enum-declaration`（244）
4. `module-declaration`（293）+ `import-equals-declaration`（396）
5. `function-declaration`（443）+ `type-alias-declaration`（458）
6. `export-declaration`（1312，单独一批）

每类四步（机械，不改逻辑）：

1. `git mv` 改名 `xxx-possible-shape.xl.md` → `xxx-rule.xl.md`；类名 `XxxPossibleShape` → `XxxRule`；
   `extends PossibleShape` → `extends RootRule`；import 换 `possible-shape.xl.md` → `items/root-rule-contract.xl.md`。
2. **判据逐字保留**：`ComputeByIndex` / `IsBuildable` 的函数体不动（含 `this.Slot()`、`cache.GetState`）。
3. `BuildByIndex`：根不会调它，但**别删**——把形参 `catalog:CatalogGuide` 换成 `table:RootRuleTable`，
   里面 `catalog.PossibleShapesComputeCache` → `table.Cache`，其余逐字。这是「只换接口」的最小动作。
   （也可整条删掉，但那是「删建造逻辑」，留到 D-2 一次性清，别在迁移批里混。）
4. 更新引用：`source-file-shape.xl.md`（import 行 + `new` 行）、`root-item-rule.xl.md`（如该族有 `BuildByKind` 分派）、
   其它 `git grep -n 'XxxPossibleShape' -- '*.xl.md' | Where-Object { $_ -notmatch ':\s*//' }` 的活体（=0 才能删旧文件）。
5. **删前先手删产物**：`dist/ts/**/<同名>.ts`、`build/ts/**/<同名>.js`，否则 tsc 编旧文件 = 假绿。

### 全部迁完之后（同一批收口，别提前做）

- `SourceFileShape.CreatePossibleShapes()` → `CreateRules():Array<IRootRule>`（含 `CreatePossibleShapesCache` 字段改名）；
- 根上 `Table` 的 `Rules` 元素类型从 `IRootRule` 吃到满，`PossibleShape` import 从 `source-file-shape` 删掉；
- 然后才是 D-2：`core/syntax/{catalog-guide, possible-shape, possible-shape-cache, i-compute-possible-shapes,
  compute-possible-shapes-states}` + `UnitToken.CatalogGuide` + `token.xl.md:128-130` 兜底 + 9 个 basic token 的两行 import
  + `BatchMode` 0/2 + `LegacyBatchAdapter` / `ShadowCompare`。

## 5. 门禁读数（commit 前实测，force 重建后）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `xl_build(core,typescript,force)` | **512 written / 0 error / 1275 warning**（511 + 新增契约） | PASS |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0（3.34 s） | PASS |
| AST 子集 | `ast-json[-diff] expression statements members` | 1214/1214；0/0/0 | PASS |
| AST 全量 | `ast-json` + `ast-json-diff` | **6167/6167；结构 0 / 位置 0 / 字段 0** | PASS |
| real-dts | `real-dts-ast.mjs` | **226/226、崩溃 0** | PASS |
| item-oracle | `tests/body-drive/item-oracle.mjs` | 454 前缀全一致 | PASS |
| batch-split | `tests/body-drive/batch-split.mjs` | 70 段 / 837 断言 / 0 失败 | PASS |
| stream-proof | `tests/body-drive/stream-proof.mjs` | 146 / FAIL 0 | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | **RESULT: PASS**，12.4 s（`tests/gates` 1/8 基线已知红） | PASS |
| xl_check | 未跑（本轮唯一缺口，建议下一棒补跑；新增文件 0 error 已由 xl_build 证实） | — | 记录 |

## 6. 收口读数（对比起点 `7ab3f857`）

| 读数 | 起点 | 本分支 | 说明 |
|---|---|---|---|
| `git ls-files '*possible*.xl.md'` | 20 | **20** | 本轮一个类都没迁，契约是纯新增 |
| `git ls-files '*.xl.md'`（tracked） | 512 | **513** | +1 = `items/root-rule-contract.xl.md` |
| `git grep -lE 'PossibleShape\|ComputePossibleShapes\|CatalogGuide\|LegacyBatchAdapter\|ShadowCompare'` | 56 | **57** | **+1 是契约文件的注释散文**，不是新代码依赖 |
| `git grep -l 'CatalogGuide'` | 42 | **43** | 同上。想看「真依赖」用 `git grep -n 'CatalogGuide' -- '*.xl.md' \| Where-Object { $_ -notmatch '^\S+:\d+:\s*//' }` |
| 迁移的类 | 0 | **0** | 下一棒从 §4 批次 1 开始 |

## 7. 踩坑（本轮新增，逐条都实际踩到）

1. **`.NET` 的相对路径写/读会落到源仓库**：`[IO.File]::ReadAllBytes("typescript/...")` 解析的是
   **进程 CWD**（= `C:\Users\Admin\Documents\GitHub\xl-example`，源仓库），不是 clone。
   本轮就用它验 BOM/CR，结果抛 `DirectoryNotFoundException`，`$b` 为 null，
   **`BOM=` / `CR=0` 是假读数**。验 BOM/CR 必须用绝对路径，或直接用 `write`/`edit` 工具（它们按 UTF-8 LF 写）。
   源仓库只被读、没被写，未污染。
2. 契约文件里出现 `CatalogGuide` 这类词会让收口 grep **不降反升**（56→57）。
   收口时要么按「排除注释行」统计，要么接受这 +1 并写清。
3. `xl_build` 输出约 17 万字节：一条 pwsh 里只 `Select-Object -Last N` 看尾部。
   `stats` 只信第一行 `— 512 written, 0 error(s)`。
4. 全量 AST 是硬门槛：批次 0 那 6 个落点如果红，**先 `git checkout -- typescript/tokens/items/root-item-rule.xl.md`**，
   再重跑 xl_build + tsc + ast-json 才看 diff（`typescript/cases` 被 checkout 后必须重跑 ast-json）。
5. 别把「批次 0 接线」和「批次 1 改名」放同一个 commit：接线红了要能一眼看出是 6 个落点里的哪一个。

## 8. 阻塞点

无。D-1 剩余部分全部是机械迁移，路径已由 §2.1 的「契约不含 BuildByIndex」解锁。
