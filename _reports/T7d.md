# T7d — 容器建树搬进 Close 拍候选的 `BuildByIndex`

- 集成分支：`feature/all-possible-1027` @ `2f202320`（T7c 已合入）
- 工作分支：`feature/all-possible-1027-t7d`；工作副本 `xl-example-set/all-possible-1027-t7d`
- 行号均指 `*.xl.md`（唯一事实源），UTF-8 口径；未跑 gates / wide-ast / tts / ts-all；未 push；未合并；目录保留
- 基线读数在同一份干净 clone（`2f202320` + `xl_build` + `tsc`）上现测，与改后逐条对拍

## 1. 改了什么（4 文件，+222 / −98）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/expressions/forms/shared/container-shape-catalog.xl.md` | 新增 `ContainerClosePossibleShape`（钩子的建树体**原样搬入** `BuildByIndex`）；删除 `ContainerShapeCloseHook` 类与 `BracketClosedHook` import；`EnsureInstalled` 降为空壳；`Installed` 恒 `false` |
| `typescript/tokens/declarations/variable-declaration-shape.xl.md` | 新增 `ContainerCloseGuide:CatalogGuide \| null`（窄目录，惰性创建）；`ComputePossibleShapes` 变成两段式壳（原方法体原样改名 `ComputeByDirectoryShapes`） |
| `typescript/tokens/statements/block-possible-shape.xl.md` | 删掉**全仓 0 调用**的 `MountControlFlowBodyCatalog`（T7a I10），保留 WP-S1 结论 |
| `typescript/tokens/files/source-file-shape.xl.md` | 只改注释：`EnsureInstalled` 已不装钩子（装配点保留到 T7e） |

未改：`core/syntax/basic-tokens/bracket.xl.md`（`Close` 两条来源、`BracketClosedHook` 类、`Transit`）、
`BracketCatalogInstaller` / `InstallAtBracketCreated` / 117 候选签名 / `Transit` 的 `[T7b:CREATE]` / T3 的 026。

## 2. 容器建树的新位置

```
Bracket.Close                                    ← 一个字未改（core 不动）
  → 自身 FlushOnClose（Close 来源）
  → parent.ComputePossibleShapes(Close)          ← 父候选先手，位置与改前完全相同
      VariableDeclarationShape.ComputePossibleShapes
        ├─ ComputeByDirectoryShapes()            ← 原方法体：A4 / A4b / P1 / P4 该建什么建什么
        └─ ContainerCloseGuide.ComputePossibleShapes(this, Close)      ← [T7d] 同一拍的第二段
              → ContainerClosePossibleShape.ComputeByIndex           ← 只认「关闭拍 + 已闭合括号 + CanBuild」
              → IsBuildable
              → BuildByIndex                                       ← ExpressionBuilder 建容器 + 原位顶替
```

- **父单元先手所有权**由时序保证：窄目录在**既有目录跑完之后**才被问；`BuildByIndex` 再按
  `units.indexOf(shape) < 0` 判「父候选已经消费」，与 B4e 的 `AlreadyConsumedCount` 同一判据。
- **为什么必须是「宿主窄目录」而不是宿主主目录**：主目录每个候选都套着 `DeclarationCellGuard`；
  `]` / `}` 关闭格上 A4b / P1 的守卫会 `Accept` 但 `IsBuildable === false`。同目录再加一条会 `Accept` 的候选，
  `Candidates.size` 恒 > 1，`CatalogGuide` 永远不建（实测：钩子 1819 次建树里 1247 次是
  `before=29 / accepts=0`，其余是「唯一守卫 Accept 但不可建」）。窄目录只有一条候选，`size === 1` 恒成立。
- **拒绝必须发生在 `ComputeByIndex`**：`CatalogGuide` 只要调用 `BuildByIndex` 就 `BuildCount += 1`；
  钩子的「拒绝」若放进 `BuildByIndex` 会变成空建（第一版实测 `018-arrow-empty-body` 3 → 4）。
  因此钩子的全部前置判据抽成 `CanBuild`（唯一一份），`ComputeByIndex` 用它决定 `Accept` / `Uncertain`，
  `BuildByIndex` 开头再判一次。**`ComputeByIndex` 永不 `Reject`**（`Candidates` 只在成功建树后 `Reset()`，
  `Reject` 会让候选在这一条声明里永久退场），非目标格返回 `Uncertain`。

## 3. `ContainerShapeCloseHook` 剩余

- **类本体：已删除**（`container-shape-catalog.xl.md` 里 0 处代码定义）；`EnsureInstalled` 不再装配，
  `BracketClosedHook.Current` 全仓恒为 `null` ⇒ `Bracket.Close` 里只剩一次 `null` 比较。
- **剩余 9 处引用全部是注释 / 文档**：本文件 2 处（历史说明）、`expression-builder:2270`、
  `right-operand-possible-shape:391`、`prefix-unary-possible-shape:322`、`object-literal-operand:39`、
  `source-file-shape:96`、`statement-route-util:1336`、`type-catalog-factory:360`。
  `source-file-shape` 一处已改；其余是「与 `ContainerShapeCloseHook` 建对象字面量同一条路」这类
  指路注释，T7e 删 `BracketClosedHook` 时一并改。
- `BracketClosedHook` 类本身、`Bracket.Close` 的调用点、`BracketCloseHook` 均**原样保留**（T7e 删）。

## 4. `BodyGuideUtil` 的剩余装配

- `BodyGuideUtil` 自身**没有任何 hook 装配**：全是静态工具（`BasePos` / `IsBodyBracket` / `MountBodyGuide` /
  `MountShell` / `CollectBodyMembers` / `FinishShell` / `CreateShapesCache`），本次未改。
- **已经在候选 `BuildByIndex` 里的那一半**：`BlockPossibleShape.BuildByIndex:186` 用
  `BodyGuideUtil.MountBodyGuide` 挂块体目录（块壳建树与装目录在同一次 Build 里完成）。
- **剩余装配（本次不能搬，记录）**：`MountBodyCatalog(` 共 7 处 —— `function-declaration-shape:121`、
  `block-possible-shape:643 / 778 / 797 / 821 / 836`、`member-shell-catalog:698`。它们的共同点是
  **「新括号的宿主是壳 / 括号，而不是当前正在建的候选」**：安装者必须是新括号宿主的目录候选
  （自举约束，T7a §5.1），而这条链现在仍由 `Bracket.ChildBracketCreatedHook` /
  `Bracket.OnBracketCreatedEvent` 在**创建拍**驱动（T7b 未删、T7e 才删）。搬它们需要把这些宿主的
  「认出自己的体括号」变成候选 `BuildByIndex`（T7a I8/I9/I11），属于下一波，不在 T7d 的容器主线里。
- 本次只做了可安全删除的一项：`MountControlFlowBodyCatalog`（定义在
  `block-possible-shape:239`，全仓 0 调用，T7a I10 判「可删」）。

## 5. 读数

### 5.1 构建

| 项 | 读数 |
|---|---|
| `xl_build(paths=["core","typescript"], targets=["ts"])` | **4 个文件被写（两次增量：3 + 1；最后一次 1 written / 636 skipped）/ 0 error / 3 warning**（仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

### 5.2 30 条 target（`tmp/target-cases.mjs` / `tmp/target-on.mjs`）

| 开关 | cases | ok | fallback | diff | error | pin-miss |
|---|---|---|---|---|---|---|
| OFF（默认） | 30 | **29** | **1（026）** | **0** | **0** | 0 |
| ON（`EnableBracketCreatePossible=true`） | 30 | **30** | **0** | **0** | **0** | 1（026 pin，T4 输入未改） |

与 `2f202320` 基线逐条一致。

### 5.3 目标 020–025（括号即表达式 6 条）

`--only=020,021,022,023,024,025`：**6 ok / 0 moved / 0 diff / 0 error / 0 fallback / 0 pin-miss**。

### 5.4 5 个 smoke（`tshape-judge ts` → `ts.json`，SHA256 前 16 位）

5 份全部 `BB07DA2201FC5087`（与基线、T7b、T7c 相同），内容均为
`{"status":"ok","structural":[],"moved":[],"fields":[]}`。

### 5.5 BuildCount（`tmp/build-count-probe.mjs`，30 case 逐条 reset 后 Parse）

| 档 | `2f202320` 基线 | 本树 | 逐 case |
|---|---|---|---|
| OFF | `127 / guardSkips=0` | **`127 / guardSkips=0`** | `Compare-Object` **零差异** |
| ON | `126 / guardSkips=0` | **`126 / guardSkips=0`** | **零差异** |

> 说明：T7c 报告写的是 127 / 127（`1f6cd14e`）；在本机对 `2f202320` 干净 clone 现测是 **127 / 126**
> （026 的 OFF/ON 差 1，仍是控制头原子）。本表以现测基线为准。
> `ContainerShapeCatalog.BuildCount`（容器顶替数）在 30 条 target 上 OFF/ON 都是 **0**，与基线相同。

### 5.6 语料回归（未在验收要求内，作为「搬对了」的证据）

| 项 | 读数 |
|---|---|
| 5007 份 `tests/cases` + `typescript/cases` 的增量 AST（`ToAstLine(0)` SHA256） | **0 diff / 5007**（改后与 `2f202320` 基线逐文件相同） |
| `ContainerShapeCatalog.BuildCount` 全语料合计 | **1821 次 / 798 文件**，与基线相同（建树次数、命中文件一个不差） |
| `RefusedCount` / `AlreadyConsumedCount` 语义 | 保留（`BuildByIndex` 内的解析失败计 `Refused`；父候选消费计 `AlreadyConsumed`），但 `CanBuild` 挡下的格不再计数（验收不读这两项） |

反证：把钩子整个关掉（只改编译产物做实验）全语料 **22 个文件 AST 变化**，其中 20 个是 e2e / exec 场景；
说明容器建树**不能**简单删掉、也不能等到 `;` 收口由 legacy 重建，时序必须保持在「父候选之后、同一关闭拍」。

## 6. 语义变化（登记，不掩盖）

1. **新增每声明一份窄目录**（惰性）：第一条声明第一次被问时创建 `CatalogGuide([ContainerClosePossibleShape])`，
   此后每条声明一次 `ComputePossibleShapes` 调用（只在 `Close` 来源）。无 `EndPossible`——候选永不 `Reject`，
   `size === 0` 不可达（候选自己保证）。
2. **`CatalogGuide.BuildCount` 的口径**：容器建树现在**计入** `CatalogGuide.BuildCount`（钩子时代不计）。
   30 条 target 上容器建树 0 次 ⇒ 读数不变；全语料会多出 1821 次（`Refused` 的空建已被 `CanBuild` 挡在
   `BuildByIndex` 之前，不会再虚增）。
3. **`EnableContainerShape` 的闸**从钩子装配时 + `OnBracketClosed` 内各一次，变成 `CanBuild` 内一次；
   默认值仍 `true`，关闭时与 base 相同的语义不变（候选不建任何东西）。
4. **`Installed` 恒为 `false`**：探针若断言「钩子已装」会看到 false——这正是 T7d 的目标状态。

## 7. 验收对照

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build` | 0 error | 0 error（4 written / 3 既有 warning） |
| `tsc -p .` | exit 0 | exit 0 |
| OFF 30 target | 29 / 1(026) / 0 / 0 | 29 / 1(026) / 0 / 0 |
| ON 30 target | 30 / 0 / 0 / 0 | 30 / 0 / 0 / 0 |
| 020–025 | 不退化 | 6/6 ok |
| 5 smoke SHA16 | 不变 | 全 `BB07DA2201FC5087` |
| BuildCount | 逐 case 与 `2f202320` 一致 | 127 / 126，零差异，`guardSkips=0` |
| 容器建树不在 hook 里 | 是 | `ContainerShapeCloseHook` 类已删；`EnsureInstalled` 空壳；`BracketClosedHook.Current` 恒 null |
| 不改 `Close` / `Transit` / installer / 117 签名 / 026 | 是 | `bracket.xl.md` 未改 |
| 不 push | — | 未 push |

## 8. 留给 T7e

1. 删 `BracketClosedHook` 类与 `Bracket.Close` 的调用点、`BracketCloseHook`（仍 0 赋值）、
   `ContainerShapeCatalog.EnsureInstalled` 及 `SourceFileShape` 的调用点（现在是空壳 + 空调用）。
2. 改掉 §3 列的 8 处历史注释（都写着「`ContainerShapeCloseHook` 建对象字面量」）。
3. 三个恒 0 计数（`BracketCreate*Count`）与两个开关的折叠（T7b/T7c 已登记）。
4. `BodyGuideUtil` 的 7 处创建拍装配（§4）——依赖 `ChildBracketCreatedHook` 删除之后的候选化，T7e 之后单独排。
