# REPORT-all-possible-B3 — class / function / enum / declare / namespace 声明族增量形状

- 任务板：`task-12`（WP-B3）
- 分支：`feat/b3`（只提交本地分支，**未 push**）
- 克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\b3-declarations`（`node_modules` 是指向 canonical 的 junction）
- base：`base-int` = `_integration/integration/all-possible` 当前 tip **`595e93ce`**（实际拿到的是「E0a + E0b 早期 + B2 已合并」的集成头；
  Lead 交接写的 `52d01c25` 是其祖先，`base-int` 已前进到含 B2 的 merge commit。本报告的 tts-impl 基线因此是 **106**，不是 45。）
- 检查点 commit：见本节末尾（一次 commit：源码 + 17 条迁移 + 本报告）

## 0. 结论（先说结果）

| 族 | 目标 case | 结果 | 迁移 |
| --- | ---: | --- | ---: |
| **class 声明族**（class-* 13 + const-enum 除外） | 13 | **全部 incremental** | 13 |
| class 声明族在 `atomic/types` 下的 4 条（详见 §5） | 4 | **全部 incremental** | 4 |
| function 族（10 条） | 10 | 仍 atomic | 0 |
| enum / const-enum（4 条） | 4 | 仍 atomic | 0 |
| declare 族（7 条） | 7 | 仍 atomic | 0 |
| module-shorthand / namespace-*（4 条） | 4 | 仍 atomic | 0 |
| `expr-yield`（B2 遗留，`function*` 声明） | 1 | 仍 atomic | 0 |
| **合计** | **43** | **17 incremental** | **17** |

> 数量口径：`git ls-files typescript/cases/tts/cases/atomic/declarations` 里 class-* 13、function-* 10、enum-* 3、const-enum 1、
> declare-* 7、module-shorthand 1、namespace-* 3 = 38，加 `atomic/statements/expr-yield` = 39；再加 `atomic/types` 下
> 由 class 声明本体驱动的 4 条（`class-ctor-param-property` / `class-implements-multi` / `class-property-definite` /
> `class-property-readonly`）= 43。以 `--show` 实测归属为准。

**为什么只做到 class 族**：根层 function / class / 装饰器声明在默认解析里走「通用 `StatementShape` 语句壳」；
`ClassDeclarationPossibleShape` 的 `IsBuildable` 只看 `Done`（`class` 关键字格就 Done），所以路由一旦让出来，
它能在 `class` 那格就 `MountShell` 一个 `ClassDeclarationShape`（类名/Pos 与 legacy 完全一致）。另外三族缺的是
**同一层的挂载能力**，不是开关（§4 逐族写了根因与继续方案）。

## 1. 实现结构（own 文件）

**新增 1 个文件**

`typescript/tokens/declarations/declaration-incremental-route.xl.md` — `DeclarationIncrementalRoute`：

```ts
static field Armed:bool = false
static method Arm:()=>void
// incremental：EnableRootDeclarationShell = false（让出根层声明壳路由），Armed = true
// legacy：若 Armed 则恢复 EnableRootDeclarationShell = true，Armed = false（不覆盖别人的实验开关）
```

**修改 3 个 own 文件**（都是在 `ComputeByIndex` / `IsBuildable` 的**第一行**插 `DeclarationIncrementalRoute.Arm();`）

1. `declarations/class-declaration-possible-shape.xl.md` — **实际产生效果的文件**
2. `declarations/enum-declaration-possible-shape.xl.md` — 前置接线（当前行为中性：enum 的路由不归
   `EnableRootDeclarationShell` 管，见 §4；留给后续 WP 在同一处接 `EnableDeclarationShell` 之外的判据）
3. `declarations/module-declaration-possible-shape.xl.md` — 同上

**没有改**：`statement-shape` / `root-expression-statement-possible-shape`（B2 own）、
`statement-possible-shape` / `control-flow-statement-possible-shape`（B1 own）、`statement-route-util`（Lead）、
`variable-declaration-shape`（E0b）、任何 import/export 文件（B5）、index/README。

### 1.1 机制（最小可行路径）

1. **让出语句壳路由**：`StatementRouteUtil.Decide` 对根层 `class` / `function` / `abstract` / `async` / `@` 的分支由
   `EnableRootDeclarationShell` 门控；`Arm()` 在增量模式把它置 false，`Decide` 于是落到 `DecideCommon`：
   `class` → `Legacy`。
2. **声明候选提前挂壳**：`ClassDeclarationPossibleShape.ComputeByIndex` 本来就设计成「`class` 关键字格 Done /
   `IsBuildable` 只看 Done / `BuildByIndex` = `BodyGuideUtil.MountShell(host, start, tokenIndex, shell)`」——
   路由让出来后它就是唯一 Accept 的候选，在 **`class` 那格**把一个 `ClassDeclarationShape`（正确 legacy 类名、
   `Pos = BasePos`）搬进根单元。`src` 起点 = 首个代码单元（`MountShell` 用 `consumed[0].SourceRange.StartIndex`），
   不吸前导 trivia；终点由壳的 `TryToClose`/`SignOut` 收。
3. **收口走既有 legacy 建树**：壳自带 `CatalogGuide([], ClassDeclarationEndPossibleShape)`；类体 `{}` 闭合时
   `ClassDeclarationEndPossibleShape.BuildByIndex` → `ClassDeclarationShape.BuildFromCode` + `BodyGuideUtil.FinishShell`
   （与 B3 之外的 class 建树**同一批函数**）⇒ EOF 树逐节点一致（账本 0 divergent）。
4. **门控**：`Arm()` 只在 `IsIncrementalShapesEnabled()` 为 true 时改路由；false 时只在 `Armed` 记录为真时恢复默认
   值（默认就是 true，所以 legacy 逐字节不变，§3.3 有实测）。

## 2. 目标 case 前后分类表（`--show` 实测）

| 迁移前 | 迁移后 | case |
| --- | --- | --- |
| atomic | **incremental** | `class-abstract`, `class-constructor-param-property`, `class-decorator`, `class-empty`, `class-extends-implements`, `class-field-modifiers`, `class-getter`, `class-method-decorator`, `class-method`, `class-parameter-decorator`, `class-property-decorator`, `class-setter`, `class-static-block`（13） + `types/class-ctor-param-property`, `types/class-implements-multi`, `types/class-property-definite`, `types/class-property-readonly`（4） |
| atomic（不变） | atomic | function-* 10、enum-* 3、const-enum、declare-* 7、module-shorthand、namespace-* 3、`expr-yield` |

`--show` 证据（tts-impl）：

```text
PASS  declarations/class-empty.ts         actual=incremental  earlier: ClassDeclarationShape@pos=0
PASS  declarations/class-method.ts        actual=incremental  earlier: ClassDeclarationShape@pos=0, MethodDeclarationShape@pos=9, IdentifierShape@pos=9, BlockShape@pos=13
PASS  declarations/class-decorator.ts     actual=incremental  earlier: ClassDeclarationShape@pos=0
PASS  types/class-property-readonly.ts    actual=incremental  earlier: ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, StaticKeywordShape@pos=9, ReadonlyKeywordShape@pos=16, IdentifierShape@pos=25, StringKeywordShape@pos=28, StringLiteralShape@pos=37
```

（`class-method` 的成员节点也一起提前了：壳挂上后成员候选在类体内部按既有目录生长，不需要本 WP 另接。）

## 3. 验收读数（本分支最终）

```text
xl_build { cwd:<克隆>, paths:["core","typescript"], targets:["ts"] }  → 0 error / 3 warning（既有 E1107）
node node_modules/typescript/bin/tsc -p .                            → exit 0
node typescript/cases/tts/run.mjs                                    → [tts] 302 条 case：throw 125/125 · atomic 124/124 · partial 53/53 · incremental 0/0
                                                                        [tts] PASS 302 / FAIL 0 / 302
node typescript/cases/tts-impl/run.mjs --quiet                       → PASS 123 / FAIL 0 / 123   （106 + 17）
两次独立进程 node typescript/cases/tts/run.mjs --json                 → SHA256 相同
                                                                        68E650106FDAC54CC11C437A91B9D0ECC60AB4A256126BF2175F9E1D4E722BC4
```

- **零漂移**：迁移前的 319 条里，只有 17 条变成 `NOW-SUPPORTED` 并被迁移；其余 302 条分类不变、逐条 PASS，
  无 `divergent` / `invalid` / `throw`。
- **EOF 一致**：账本对每条同时跑 legacy/incremental 并比较 `shapeLines`（类名+pos+文本字段，剥 `src`）；
  17 条新 incremental 全部 `divergent=0`。
- **开关 false / 静态开关不泄漏**：`Arm()` 改的是静态字段，必须证明它不会把 incremental 的状态漏进 legacy。
  `tmp/stale-check.mjs`（gitignored）对 6 条样本做「冷启动 legacy 逐字符树」vs「先跑一遍 incremental 再 legacy」
  的逐字节比较（6/6 SAME）：

```text
SAME legacy-after-incremental vs cold-legacy: tts-impl/cases/declarations/class-empty.ts
SAME ... class-method.ts
SAME ... tts/cases/atomic/declarations/function-basic.ts
SAME ... enum-numeric.ts
SAME ... declare-const.ts
SAME ... namespace-basic.ts
SUMMARY same=6/6
```

  另外：本 WP 在 legacy 模式下不改变任何候选的返回值（新增代码只有 `Arm()` 的恢复分支），
  且 302 条 PASS 的 legacy 参照树逐条参与了对拍。

## 4. 未达成族：根因与继续方案（交接重点）

### 4.1 function（10 条 + `expr-yield`）

- **根因**：`FunctionDeclarationPossibleShape` **没有对应的 end possible shape / body guide**（目录里没有
  `function-declaration-end-possible-shape.xl.md`）。它的 `BuildByIndex` 是「在体起点那一格用
  `FunctionDeclarationShape.FromUnits(host, start, tokenIndex)` 一次性建完整声明」，而且 `IsBuildable` 要求
  `DoneAt === tokenIndex`；路由让出后，guide 第一次看到它时 `DoneAt` 已过 ⇒ 永远等不到，仍由语句壳在 `}` 处建。
  我试过「关键字格就 Done + 放宽 IsBuildable」，结果 `FromUnits` 在只有 `[function, 空格]` 两格时抛
  「函数声明不完整」⇒ 9 条 divergent（已回退，未留在分支里）。
- **继续方案**（给后续 WP）：照 `class-declaration-end-possible-shape.xl.md` 的 51 行新建
  `function-declaration-end-possible-shape.xl.md`（`ComputeByIndex` = 体 `{}` 闭合 / `;`（ambient）/ 换行 ASI 时 Accept；
  `BuildByIndex` = `FunctionDeclarationShape.BuildFromCode` + `BodyGuideUtil.FinishShell`），并在
  `FunctionDeclarationShape` 的构造里挂 `new CatalogGuide([], new FunctionDeclarationEndPossibleShape())`；
  再把 `FunctionDeclarationPossibleShape.BuildByIndex` 的增量分支改成 `BodyGuideUtil.MountShell(...)`，关键字格即
  Done（§4.1 的两处失败点都已实测定位）。工作量估计 1–2 轮。
- `expr-yield`（`function* g() { yield 1; }`）同一个根因，不需要单独做。

### 4.2 enum / const-enum / module / namespace / declare

- **根因**：这些关键字**不在** `Decide` 的 `EnableRootDeclarationShell` 分支里；`DecideDeclaration` 直接返回
  `ShellDeclarationFamily`（route 7），于是 `DeclarationStatementPossibleShape` 依约建通用语句壳。让声明候选提前挂壳
  必须让 route 变成 `Legacy`，有两条路：
  1. 把 `EnableDeclarationShell` 也置 false（`DecideDeclaration` 第一行就会返回 `None`，最终落 `Legacy`）。
     **实测危险**：它同时让 `ShouldYieldToDeclarationShell` 失效、并让 import/export 候选在 legacy 模式也改变让位行为，
     静态开关在「上一 case incremental → 下一 case legacy」的窗口里会污染 legacy 时序（本 WP 因此**没有**采用）。
  2. 在 `declaration-statement-possible-shape.xl.md`（B5 own，B5 会在其中加 `[XL-B5]` 前置分支）里**追加**一条
     `[XL-B3]` 分支：`IsIncrementalShapesEnabled()` 且首词 ∈ {enum, declare, namespace, module, const-enum} 时
     `return ShapeStates.Reject`；同时 `ControlFlowStatementPossibleShape`（B1 own）必须对同一组词也 Reject，
     否则会与声明候选同格双 Accept（`CatalogGuide` 抛「终结候选与其它候选同时成立」）。这一步需要 **Lead 裁决 B1/B5
     的文件所有权**，本 WP 没有擅自改。
  3. 各族的 `IsBuildable` 里 enum 已是 `Done` 口径（可以直接用）；module 是 `Status/End` 口径；declare 族
     （`declare const/let/var/function/global/module string/namespace`）走的是变量三层/声明族，还要额外的 `declare`
     修饰 + 三层声明支持（A5/A6 面），不是单纯挂壳能收的。
- 建议：**B3 的 class 部分已交付；enum/module/namespace 作为「同一路由开关的第二次开关化」交给 B7 或一个小的续任 WP**，
  前置条件就是上面第 2 点的 two-file 改动 + Lead 允许改 B1/B5 的 2 个文件。

## 5. 跨 WP 边界（需要 Lead 裁决）

1. **迁了 4 条 `atomic/types/class-*.ts`**（`class-ctor-param-property` / `class-implements-multi` /
   `class-property-definite` / `class-property-readonly`）：它们由 class 声明本体驱动、随本机制一起变绿；不迁则
   `tts` 不 exit 0。这 4 条在 PLAN 里属 B4b-ii 的类型清单，建议合并时从 B4b-ii 目标扣除（它们已进 tts-impl/cases/types）。
2. **`enum-declaration-possible-shape` / `module-declaration-possible-shape` 里加了 `Arm()` 前置接线**（各 2 行）：
   当前行为中性（这两个族仍 atomic，已用账本 302 PASS 证明无漂移），目的是把开关点放在族候选里，续任者只改判据即可。
   如果 Lead 希望 diff 更小，可以只保留 `class-declaration-possible-shape` 的那两处，删掉 enum/module 的两处——
   行为不变（已复核）。
3. **未碰 import/export**：`export-declare-const` 按 Lead 指示留给 A5/A6；本 WP 没有任何 export/import 相关改动。

## 6. 给 B4a / B7 的复用建议

1. **B4a（interface）可以直接复用 `DeclarationIncrementalRoute`**：interface 与 class 同构（有
   `interface-declaration-end-possible-shape` + `BodyGuideUtil`），只要在 `InterfaceDeclarationPossibleShape` 的
   `ComputeByIndex`/`IsBuildable` 第一行调 `DeclarationIncrementalRoute.Arm()`，再确认它的 `IsBuildable` 不是
   `DoneAt === tokenIndex` 那种一次性口径即可（interface 的 candidate 与 class 同写法，预计直接可用）。
2. **B7 收口时要处理的静态开关**：`DeclarationIncrementalRoute.Armed` 是进程级静态状态；将来若有人把
   `EnableIncrementalShapes` 默认值翻 true，需要保证 `Arm()` 在「新一次 Parse 开始」时被至少一个候选调用
   （声明候选在根 guide 里 index ≥ 4，import/export 候选在其之前；legacy 模式已实测不受影响，因为 `Arm()` 恢复时
   只回写自己改过的值）。若 B7 把 parser 改成多文档并发，请把 `Armed` 换成 per-context 状态。
3. **探针**：`tmp/probe.mjs batch` 一次跑完 declarations 全部目标、输出 `GREEN/atomic/DIVERGENT + earlier` 明细，
   是本 WP 的主要推进工具（`diff` 单条、`steps`/`legacysteps` 看逐字符树）。续任者复制到自己的 tmp 用。
4. **验收模板**：`tts` 全量 PASS（数量 = 319 − 迁走数）+ `tts-impl PASS (实际基线 + N)` + 两次 `--json` 同哈希 +
   `tmp/stale-check.mjs` 的 legacy 冷/热对比（静态开关类改动的必测项）。

## 7. 风险

1. **静态开关的路由副作用面**：`EnableRootDeclarationShell=false` 只影响 `Decide` 里 function/class/abstract/async/@
   五个根分支；但它是全局字段。已用 6 条样本的冷/热 legacy 对比 + 302 条账本对拍证明当前无泄漏。若后续有人在这五个
   分支上再加判据，需要重新跑 `tmp/stale-check.mjs`。
2. **EOF 树依赖壳的收口路径**：class 的收口是 `ClassDeclarationEndPossibleShape` → `BuildFromCode` →
   `BodyGuideUtil.FinishShell`，与默认路径（语句壳在 `}` 处调 `BuildClassDeclaration`）**不是同一个调用点**。
   本次 17 条全部 `divergent=0`，但这是「两批建树函数恰好同源」的实证结论；若以后有人只改其中一条路径
   （例如只改 `StatementBuilder.BuildClassDeclaration`），两条路径会分叉——B7 合并时请把两处一起改。
3. **`src` 尾部 trivia**：`MountShell` 的 `src` 起点是首个代码单元（正确），终点由壳 `TryToClose` 的
   `LastIndex/End` 收，本批 17 条 `residualBasicLines=0`、无 `rangeOnlyDifference` 相关失败；但 `src` 的
   94 条历史缺陷仍归 B6。
4. **`as`/`satisfies` 与类型注解**：`declare-*` 与带类型注解的 class 成员仍以 raw 单元躺在壳里，现由 legacy 函数在
   收口时建；B4b/B4a 接类型目录时不要把「成员是否已建」当成增量证据（`BodyGuideUtil.CollectBodyMembers` 已处理
   raw/形状混合，但成员候选接线后行为会变）。

## 8. commit 与交接

- commit：本报告与源码/迁移同一 commit（commit message `feat(b3): early-mount class declaration shape under incremental route`）。
  `git status` 干净；`tmp/**` 全部 gitignored；未 push、未删克隆。
- 未竟项按 §4 分三块：function/expr-yield（需新建 end possible，1–2 轮）、enum/module/namespace（需 B1/B5 两个文件 +
  Lead 裁决，1 轮）、declare 族（A5/A6 的类型 + declare 修饰面，不属于 B3 能单独收）。
- 下一接手者：从本 commit 拉分支；`tmp/probe.mjs batch` 起手，先把 function 的 end possible 建出来即可复用本 WP 的
  `Arm()` + `MountShell` 模式。
