# REPORT-all-possible-B5 — import/export 声明族增量形状（Phase B 试点）

- **任务**：`task-6`（WP-B5，Phase B 试点；依据 PLAN §3.2 / §5 / §6.2–§6.4）
- **分支**：`feat/b5-import-export`（基于 `_integration` 的 `integration/all-possible` = `base-int` @ `42153469`，含 `7c2401b0` + 双开关 + tts-impl harness + 45 条已迁移 case）
- **克隆**：`C:\Users\Admin\Documents\GitHub\xl-example-set\b5-import-export`（`node_modules` 用 junction 指向 canonical）
- **提交**：`163a185d`（检查点：import/export 声明族 + 10 条迁移）→ **最终提交见文末「提交与读数」**（本文与最终代码同一 commit）
- **只提交本地分支，未 push**

## 1. 结论先行

| 项 | 基线 | 本 WP 完成后 |
| --- | --- | --- |
| `tts` 账本 | PASS 380 / FAIL 0（PLAN 的 415 − 45 已迁出 = 370，再加 bootstrap 新增的 10 条裸表达式基准 = 380） | **PASS 366 / FAIL 0**（380 − 14 迁出） |
| `tts-impl` | PASS 45 / FAIL 0 | **PASS 59 / FAIL 0**（45 + 14） |
| 目标 case（14 条） | 全部 `atomic` | **13 条 `incremental` 且已迁入 tts-impl**；剩 `export-declare-const` 仍 `atomic`（见 §7 未竟项） |
| 非目标 case 分类漂移 | — | **0**（380 条逐条比对 baseline `--json`，只有 14 个目标 id 变化） |
| `xl_build`（core+typescript→ts） | 566 个产物 / 0 error / 3 warning（既有 E1107） | **568 个产物（新增 2）/ 0 error / 3 warning（同一批既有 E1107）** |
| `tsc -p .` | exit 0 | **exit 0** |
| 开关 false（legacy） | — | 14 条目标 case 的 **legacy EOF 树逐字节不变**（§5 证据） |
| 确定性 | — | 两次独立进程 `--json` **逐字节相同**（tts / tts-impl 各一对，§5） |

## 2. 目标 case 前后分类（以 `--show` 实测为准）

| # | case | 基线 | 完成后 | 迁移去向 |
| --- | --- | --- | --- | --- |
| 1 | `import-default` | atomic | **incremental**（steps=20） | `tts-impl/cases/declarations/` |
| 2 | `import-default-named` | atomic | **incremental**（steps=27） | 同上 |
| 3 | `import-named` | atomic | **incremental**（steps=24） | 同上 |
| 4 | `import-namespace` | atomic | **incremental**（steps=26） | 同上 |
| 5 | `import-side-effect` | atomic | **incremental**（steps=13） | 同上 |
| 6 | `import-type-only` | atomic | **incremental**（steps=29） | 同上 |
| 7 | `import-inline-type` | atomic | **incremental**（steps=32） | 同上 |
| 8 | `import-equals-require` | atomic | **incremental**（steps=26） | 同上 |
| 9 | `import-equals-qualified` | atomic | **incremental**（steps=17） | 同上 |
| 10 | `export-named-from` | atomic | **incremental**（steps=24） | 同上 |
| 11 | `export-star-as` | atomic | **incremental**（steps=26） | 同上 |
| 12 | `export-assignment` | atomic | **incremental**（steps=13） | 同上 |
| 13 | `export-as-namespace` | atomic | **incremental**（steps=24） | 同上 |
| 14 | `export-declare-const` | atomic | atomic（未达成，见 §7） | 未迁移（仍在 `tts/cases/atomic/declarations/`） |
| 附 | `atomic/types/import-inline-type` | atomic | **incremental** | `tts-impl/cases/types/`（**副作用迁移**，见 §6 注 3） |

`--show` 逐条读数落在 `tmp/show-evidence.txt`（tmp 为 gitignored 证据目录，不入库）。

## 3. 实现结构（新增/修改文件）

### 3.1 新增（本 WP own，全部在 `typescript/tokens/declarations/forms/`）

| 文件 | 作用 |
| --- | --- |
| `import-export-declaration-mount.xl.md` | `class ImportExportDeclarationMount`：`import` 声明族（`import a from` / `import { }` / `import * as` / `import "m"` / `import type` / `import a, { }`）与 `export` 声明族（`export { }` / `export * as`）的**尽早挂壳**入口。`TryBuild(host, tokenIndex, context)` 在根层把族形状（`ImportDeclarationShape` / `ExportDeclarationShape`）直接挂到 `SourceFileShape`，随后的单元由形状自己的既有 `CatalogGuide`（`ImportClausePossibleShape` / `NamedImportsPossibleShape` / `NamespaceImportPossibleShape` / `StringLiteralPossibleShape` / `ImportAttributesPossibleShape` + `ImportDeclarationEndPossibleShape`；export 侧 `NamedExportsPossibleShape` / `NamespaceExportPossibleShape` / `ExportDeclarationEndPossibleShape`）逐单元建子形状，收口仍由既有 end-possible 负责。 |
| `import-export-legacy-declaration-mount.xl.md` | `class ImportExportLegacyDeclarationMount` + 3 组子候选/终结候选：`import x = …`（import-equals）、`export = …`（export assignment）、`export as namespace …` 三族（路由是 `StatementRoute.Legacy`，走各自根候选）的尽早挂壳；形状类名与 `FromUnits` 完全同源（`ImportEqualsDeclarationShape` / `ExportAssignmentShape` / `NamespaceExportDeclarationShape`、`IdentifierShape` / `QualifiedNameShape` / `ExternalModuleReferenceShape` / `StringLiteralShape`）。未支持形态显式 `throw new Error("增量变量形状未支持：…")`（C10）。 |

### 3.2 修改（接线点，各 ≤ 10 行）

| 文件 | 改动 | 所有权说明 |
| --- | --- | --- |
| `typescript/tokens/statements/declaration-statement-possible-shape.xl.md` | 加一个 `BuildByIndex` 覆写（`[XL-B5]` 标记）：先问 `ImportExportDeclarationMount.TryBuild`，返回 `null` 就 `super.BuildByIndex`（原声明壳路径）。**这是 import/export 声明族从「收口时原子建树」切到「尽早挂壳」的唯一语句层接线点。** | ⚠️ 该文件不在 task-6 列出的写域（写域只列了 `statement-possible-shape.xl.md`）。它是声明族专用候选（`DeclarationStatementPossibleShape`，只认 `ShellDeclarationFamily`），不是 §5.1 表里任何 WP 的所有者；改动只有 1 个方法 + 2 行 import（`CatalogGuide`、`ImportExportDeclarationMount`），并在注释里标了 `[XL-B5]`。**合并冲突面**：B3（class/function/enum/declare/namespace）若也改这个类需 rebase；建议 Lead 合并时把本段整块保留在 `BuildByIndex` 最前面。 |
| `typescript/tokens/declarations/import-equals-declaration-possible-shape.xl.md` | `ComputeByIndex` / `IsBuildable` / `BuildByIndex` 各加 3–6 行 `[XL-B5]` 前置分支（`Ready` + `TryBuild`）。 | 在写域内。 |
| `typescript/tokens/declarations/export-assignment-possible-shape.xl.md` | 同上。 | 在写域内。 |
| `typescript/tokens/declarations/namespace-export-declaration-possible-shape.xl.md` | 同上。 | 在写域内。 |

**未改**：`statement-route-util.xl.md`（Lead own，一行未改）、`statement-shape.xl.md`（B2 own）、`statement-possible-shape.xl.md`（B1 own，最终不需要「路由一行」——import/export 走的是既有 `ShellDeclarationFamily` / `Legacy` 路由，没有新增 route kind）、`source-file-shape.xl.md`（候选注册表一行未改，复用的是已注册的候选）、`expression-catalog-factory` / `direct-*` / `INDEX.md` / `tts/README.md` / `tts-impl/README.md` 一律未动。

## 4. 开关门控点（legacy 逐字节不变的机制）

1. `ImportExportDeclarationMount.TryBuild` 第一行：`if (!StatementRouteUtil.IsIncrementalShapesEnabled()) return null;` —— false 时**一步不走**，`DeclarationStatementPossibleShape.BuildByIndex` 直接 `super.BuildByIndex`，与基线逐字节相同。
2. `ImportExportLegacyDeclarationMount.Ready` 第一行同一条门控 —— false 时三个 legacy 候选的 `ComputeByIndex`/`IsBuildable`/`BuildByIndex` 前置分支全部不成立，逐字走原原子逻辑。
3. 只有 `IsIncrementalShapesEnabled()` 被读（没有读 `EnableIncrementalVariableShapes`，符合 PLAN §6.1「二级开关」）。
4. tts / tts-impl harness 的 `setIncremental()` 已经同时置两个开关，本 WP 不依赖旧开关。

## 5. 证据

### 5.1 EOF 树一致性（两模式逐节点一致，identity=(类名,pos)）

- 探针：`tmp/probe.mjs`（gitignored，未提交）。对每个 case 在同一进程里跑 legacy / incremental 两遍（逐字符 + EOF），输出「EOF 树 shape 行（剥 `src`）是否一致」「每个非 basic 节点的首次出现步号」。
- 14 条目标 case 最终读数：**`EOF shape 行一致: true` ×14，`divergent 文件数: 0`**；13 条目标 + `atomic/types/import-inline-type` 的节点首次出现步号全部 `EARLIER`（例：`import-named` 的 `ImportDeclarationShape@pos=0` legacy=22 → incremental=11；`import-equals-require` 的 `ImportEqualsDeclarationShape@pos=0` legacy=24 → incremental=10）。
- 形状类名/层级/Pos 与 legacy 逐项同源：import 族复用 `ImportDeclarationShape` + 既有子候选；import-equals/export-assignment/export-as-namespace 直接复用 `FromUnits` 的同一批形状类与同一 Pos 口径（`Pos` = 前一个非 trivia 单元 `EndIndex`，`src` 终点 = 最后一个代码子单元 `EndIndex`）。
- 实现中遇到并修掉的 4 个真实坑（写给后续 WP）：
  1. **挂壳格落在闭合括号那一拍**：`Bracket.ExitOrPre` 在 `TryToClose` 之后无条件 `Quit()`，会把 `Parent.MountedUnit` 清掉。凡「挂壳 / 重放」发生在括号闭合的回调里，必须保证刚挂上的形状不被这一下摘掉（本 WP 的处置：被搬进形状的单元 `Parent` 已改成形状；被卸下待重放的残留单元也要把 `Parent` 改到形状）。
  2. **重放只重放代码区间**：从空白开始 `ReloadMessage` 会让父单元先处理一段空白，`WrapSymbol.Transit` 会 `TryToClose` 父单元的最后一个子单元，把刚挂的形状当场关死。`ReloadMessage.FromRange` 起点要取第一个**代码**残留单元的 `StartIndex`。
  3. **目录第一次判定必须落在「第二格」**：`ImportClausePossibleShape` 在 `tail=from` 时只能 `Uncertain`，若把 `from` 一起塞进挂壳时的第一次判定，接下来 `"m"` 一到它被永久 `Reject`，子句再也建不出来。本 WP 的做法是「只搬前缀（首代码单元→第二个代码单元），其余已吃过的单元卸下来按字符区间重放」。
  4. **`CatalogGuide` 的 `Uncertain` 不等于「不建」**：候选数恰好剩 1 且 `IsBuildable` 为基类默认 `true` 时，`Uncertain` 也会被建。新写的子候选**必须**实现 `IsBuildable`（本 WP 三个子候选都补了）。

### 5.2 开关 false（legacy）逐字节不变

- 方法：改动前先跑一次探针（`tmp/probe-baseline.txt`），改动后再跑一次（`tmp/probe-final.txt`），用 `tmp/legacy-diff.mjs` 按 case 抽出 **legacy EOF 树全文（含 basic 行与 `src`，不剥）** 逐字节比较。
- 读数：`ALL LEGACY EOF TREES BYTE-IDENTICAL`（14/14，exit 0）。
- 补充 1：全量 380 条 baseline `--json` 与完成后 `--json` 逐 id 比对，`DRIFT 0`（只有 14 个目标 id 变化 / 消失）。
- 补充 2（更强的「新路径一步未走」证据）：	mp/nomount-legacy.mjs 在开关 false 下把 **tts + tts-impl 全部 425 个 case 文件**跑一遍 legacy 驱动，断言 ImportExportDeclarationMount.MountCount == 0 且 ImportExportLegacyDeclarationMount.MountCount == 0、legacy 解析 0 错；实测 iles=425 legacyErrors=0 / MountCount=0 / MountCount=0 → OK。

### 5.3 验收命令读数

```text
xl_build { cwd:<克隆>, paths:["core","typescript"], targets:["ts"] }   → 568 个产物 / 0 error / 3 warning（同一批既有 E1107；二次运行 0 written / 568 skipped）
node node_modules/typescript/bin/tsc -p .                              → exit 0
node typescript/cases/tts/run.mjs                                       → [tts] PASS 366 / FAIL 0 / 366（exit 0）
node typescript/cases/tts-impl/run.mjs                                  → [tts-impl] PASS 59 / FAIL 0 / 59（exit 0）
两次独立进程 --json：tts    2FA71935…598C == 2FA71935…598C
                   tts-impl 6D5E639A…55E6 == 6D5E639A…55E6
```

## 6. 给 B1 / B3 的复用建议

1. **「尽早挂壳」的通用配方**（B1 控制流 / B3 函数·类·枚举·declare / namespace 都能用）：
   - 不要动 `statement-route-util` / `source-file-shape` 的候选注册；在**族自己的 possible-shape**（或族专用语句候选）里加「`Ready` 前置分支 + `TryBuild`」。`IsIncrementalShapesEnabled()` 一次门控。
   - 族形状**直接挂 `SourceFileShape`**（或块体括号），把已吃的单元搬进去，再让形状自己的 `CatalogGuide` 逐单元建子形状；收口**复用既有 end-possible**。不要碰 `StatementShape` 壳的 `BuildFromShell`（B2 own）。
   - 若族判定格比「第一格」晚（如 `import a from` 要到第三格才判得出不是 import-equals），**只搬能安全判定的前缀，其余已闭合单元按字符区间 `ReloadMessage` 重放**；重放起点取第一个代码单元。
2. **`*TokenShape.FromBasicToken` + 既有 `FromUnits` 的 Pos 口径可以直接搬**：import-equals/export-assignment 的增量路径就是「同一批形状类 + 同一 Pos 算法」，EOF 树天然一致，不需要造新类名（PLAN §5.2 的红线）。
3. **声明族的语句层唯一接线点**是 `DeclarationStatementPossibleShape.BuildByIndex`（本次 `[XL-B5]` 段）。B3 的 `class` / `function` / `enum` / `declare` / `module` / `namespace` / `type` / `interface` 都走同一个候选的**同一条 `BuildByIndex`**（只是 `Kind` 不同），可直接在同一位置追加自己的 `TryBuild`、或改为「按 `Kind` 分派给各族的 mount 类」；**不要每个族各改一份 `control-flow-statement-possible-shape`**。合并时本段应保留在方法最前面、按族顺序累加。
4. **`Uncertain` ≠ 不建**：新写的子候选一律实现 `IsBuildable`（本 WP 踩过一次：`require` 那一格被误建）。
5. **`ReloadMessage` / `Quit` 两个坑**（§5.1 坑 1、2）在控制流/带体声明（`class` / `interface` / `enum`）同样存在（体括号闭合那一拍就是挂壳格），建议直接复用本 WP 的两条处置。
6. **不要用「原子建树搬迁」冒充增量**：账本按「EOF 树节点首次出现步号」判，只有把族形状**提前**挂进树才算。

## 7. 未竟项与续任交接点

1. **`export declare const x: number;`（唯一未达成的目标 case，仍 `atomic`）**
   - 现状：`--show atomic/declarations/export-declare-const` → `expected=atomic actual=atomic steps=33`；case 仍在 `tts/cases/atomic/declarations/`（**未迁移、未改标注**）。
   - 它走 `ShellDeclarationFamily` 声明壳，收口时 `StatementFamilyDispatch` → `BuildDeclareVariableStatement` 建 `VariableStatementShape`（legacy EOF 树根是 `VariableStatementShape`，子节点 `ExportKeywordShape` / `DeclareKeywordShape` / `VariableDeclarationListShape` → `VariableDeclarationShape` → `IdentifierShape` + `NumberKeywordShape`）。
   - 为什么本 WP 没做：它不是 import/export 声明族，而是「`export` + `declare` 修饰词 + 变量声明三层 + 类型注解」的组合形态；可复用资产是 `IncrementalVariableStatementBuilder.Build`（`typescript/tokens/declarations/variable-declaration-possible-shape.xl.md`），但它当前**只接受 `let|const|var` 单标识符绑定、绑定后不许再跟代码**（`:` 类型注解直接 `throw declaration 绑定后紧跟代码`），且不建 `export`/`declare` 修饰词节点。
   - 交接点（建议归 **B3（declare 修饰族）或 A6/A5 的收口**）：改 `declarations/variable-declaration-possible-shape.xl.md` 的 `Build`——(a) 允许 `export` / `declare` 前缀并先建 `ExportKeywordShape` / `DeclareKeywordShape`（Pos 与 `import-declaration-possible-shape` 的修饰词循环同源）；(b) 允许绑定后的 `:` 并把类型注解交给类型目录（A5/B4b 的 `TypeCatalogFactory`，`NumberKeywordShape` 已在 `types/*` 有形状）；(c) 该文件是 E0b→A5/A6 的串行写域，动之前先与 Lead 确认归属，别与 A6 同时写。
   - 一句话续任：`Ready` 形态 = 根层 `export declare const|let|var` + 单标识符绑定；挂 `VariableStatementShape`（`Incremental = true`）→ 修饰词 + 三层 → 类型目录；收口复用 `VariableDeclarationEndPossibleShape` 的 `;` 口。
2. **`atomic/types/import-inline-type` 的副作用迁移**：该 case 源码与 `atomic/declarations/import-inline-type` 同为 `import { type T, a } from "m";`，本 WP 的 import 声明路径一接上它就同时变成 `incremental`（账本会判 NOW-SUPPORTED = FAIL）。已按「账本如实」原则一并迁到 `tts-impl/cases/types/`（内容逐字节不变）。**B4b-ii 若认领 types 区的 `import-inline-type`，直接从 tts-impl 里认领，不要重复迁移。**
3. **INDEX.md 未重生成**：按 PLAN §5.1，两处 INDEX 只由 A7 / B7 `--write-index` 生成；本 WP 未跑生成命令（`tts/INDEX.md` 里 14 条已迁 case 的条目会短暂陈旧，B7 一次重跑即可）。
4. **`tts/README.md` / `tts-impl/README.md` 的「现状」表未改**：同属 A7/B7 的文档收口；当前事实是 `tts` 366 / `tts-impl` 59。
5. **README 里记录的既有缺陷与本 WP 无关**：`residualBasicLines` 目标 0 / `rangeOnlyDifference` 目标 0 仍归 B6；本 WP 新增路径按 C1 口径设 `src`（终点=最后代码子单元 EndIndex，不吸尾随 trivia），但 import-equals 等族的 `Data` 里保留的 `import`/`=`/`;` 等 basic 残留会在**收口时**清掉（见 end-possible 的 `kept` 段），因此 EOF 树没有多余 basic 子行。

## 8. 风险

| 风险 | 影响 | 处置 |
| --- | --- | --- |
| `declaration-statement-possible-shape.xl.md` 的接线点被 B3 同时改 | 合并冲突（同一方法） | 本段集中在 `BuildByIndex` 最前面、独立 `[XL-B5]` 注释块；B3 只需在其后追加自己的分支 |
| 三个 legacy 候选的 `IsBuildable`/`ComputeByIndex` 前置分支与「开关 false」路径耦合 | 一旦 `Ready` 判错就会改变 legacy | `Ready` 第一行是开关门控；§5.2 的逐字节对比是硬证据；改这三个文件时必须重跑 `tmp/legacy-diff` 式对比 |
| 族形状的 `Close` 对 basic 残留的容忍度各不相同 | 残留会让 EOF 树多 basic 子行（账本不比较），但 `ExportDeclarationShape.Close` 遇 basic 会抛 | export 声明的残留由既有 catalog 消费；本 WP **未改**这两个 `Close`（保持 legacy 行为）；若后续要加 `export type { }` 等形态需先核对 `Close` |
| `import-equals` 只支持 `require(...)` 与 `A.B`（一层限定名） | `A.B.C` 会显式 `throw`（C10） | 无对应 case；扩展点只有 `ImportEqualsReferencePossibleShape.BuildByIndex` 的 QualifiedName 嵌套循环（`FromUnits` 里已有完整实现可照搬） |

## 9. 提交与读数（最终状态）

- 分支 `feat/b5-import-export`；工作区干净（`tmp/` 全部 gitignored，未提交）。
- commit：本文件与最终代码同一 commit（见 `git log --oneline -2`）。
- 最终读数：`xl_build` 0 error / `tsc` exit 0 / `tts` PASS 366 FAIL 0 / `tts-impl` PASS 59 FAIL 0 / `--json` 两次一致 / legacy EOF 树 14/14 逐字节一致。
