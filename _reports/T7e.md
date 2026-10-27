# T7e — 删除已死的 close 钩子与 `EnsureInstalled` 空壳

- 集成分支：`feature/all-possible-1027` @ `7fb5e6a3`（T7d 已合入）
- 工作分支：`feature/all-possible-1027-t7e`；工作副本 `xl-example-set/all-possible-1027-t7e`
- 行号均指 `*.xl.md`（唯一事实源）；未跑 gates / wide-ast / tts / ts-all；未 push；未合并；目录保留
- 基线读数在同一份干净 clone（`7fb5e6a3` + `xl_build` + `tsc`）上现测；BuildCount 对照树为主仓
  `xl-example`（HEAD = `7fb5e6a3`，构建产物仍含 `BracketClosedHook` ⇒ 确认是改前树）

## 1. 删除项（9 文件，+20 / −112）

| # | 文件 | 删除内容 |
|---|---|---|
| 1 | `core/syntax/basic-tokens/bracket.xl.md` | `BracketCloseHook` 整类（52 行：字段 `Current` + 抽象方法 `OnBracketClosing`）；`BracketClosedHook` 整类（字段 + `OnBracketClosed`）；`Bracket.Close` 里两处 `Current` 调用（`[B4b:CLOSE]` 与 `[B4e:K1]` 两个 if 块）及配套注释；`Close` 文档段里「关闭后通知」一段改写为 [T7e] 现状 |
| 2 | `typescript/.../shared/container-shape-catalog.xl.md` | `ContainerShapeCatalog.EnsureInstalled` 整个方法（含空壳 `return;`）；`Installed` 字段；开头段与 `ContainerClosePossibleShape` 段里对 `BracketClosedHook` / `ContainerShapeCloseHook` 的历史叙述改为候选口径 |
| 3 | `typescript/tokens/files/source-file-shape.xl.md` | `ContainerShapeCatalog.EnsureInstalled()` 调用；`ContainerShapeCatalog` 的 import（删调用后成为未用导入）；原 [T7d] 注释改为 [T7e] 一行 |
| 4–9 | `expression-builder`、`right-operand-possible-shape`、`prefix-unary-possible-shape`、`object-literal-operand`、`statement-route-util`、`type-catalog-factory` | 9 处 `ContainerShapeCloseHook` / `BracketClosedHook` 残留注释中的 6 处改写为「容器关闭格候选 `ContainerClosePossibleShape.BuildByIndex`」；`statement-route-util` 两段（`EnableContainerShape` 的 true/false 语义）同步改写 |

`Bracket.Close` 的保留部分**一字未动**：`this.Closed = true` → 自身 `FlushOnClose`
（`ComputePossibleShapesByIndex(Data.length - 1, Close)`）→ `parent.ComputePossibleShapes(ctx, Close)`，返回值语义不变。
core 里不再有任何「关闭后通知」入口。

## 2. 保留项（逐条核对）

| 对象 | 状态 |
|---|---|
| `BracketRoleHook`（core 类 + `Current` + `OnBracketCreated`） | **保留**，20 处引用；T7c 的四线 `InstallAtBracketCreated` 分派未改 |
| `ChildBracketCreatedHook` / `BracketChildCreatedHook` | **保留**，12 处引用；7 处 `MountBodyCatalog` 驱动链未改（T7f 再迁 observer） |
| `BracketRoleCatalogHook` / `BracketRoleCatalogHook.EnsureInstalled` | **保留**（12 处）；与 `ContainerShapeCatalog.EnsureInstalled` 无关 |
| `ContainerClosePossibleShape` / `ContainerCloseGuide` | **保留**（16 / 5 处）；T7d 的 `BuildByIndex` 与 `ComputePossibleShapes` 两段式壳未改 |
| `BracketRoleResolver`、117 候选签名、T3 的 026、T7b 的 `Transit` | 未改 |
| `BracketClosedHook` 的实现 / 调用 | 全仓 0 处（删除前也已 0 实现）——任务 §5 的「停下来」条件未触发 |

## 3. grep（core + typescript + build，注释也算）

| 模式 | 命中 |
|---|---|
| `BracketCloseHook` | **0** |
| `BracketClosedHook` | **0** |
| `ContainerShapeCloseHook` | **0** |
| `ContainerShapeCatalog.EnsureInstalled` | **0** |

> `_reports/*` 历史报告未计入。

## 4. 读数

| 项 | 读数 |
|---|---|
| `xl_build(paths=["core","typescript"], targets=["ts"])` | **637 written / 0 error / 3 warning**（仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| OFF 30 target | **29 ok / 1 fallback（026-if-regex-test）/ 0 diff / 0 error** |
| ON 30 target（`EnableBracketCreatePossible=true` preload） | **30 ok / 0 fallback / 0 diff / 0 error** |
| 5 smoke `ts.json` SHA256 前 16 位 | 5 份全 **`BB07DA2201FC5087`**，内容均为 `{"status":"ok","structural":[],"moved":[],"fields":[]}` |
| BuildCount OFF | **127 / guardSkips=0**（基线 127；30 case 逐条 `Compare-Object` **零差异**） |
| BuildCount ON | **126 / guardSkips=0**（基线 126；逐条**零差异**） |

5 个 smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。

## 5. 语义登记

- `Bracket.Close` 少一次常量 `null` 比较（`BracketCloseHook` 删除）与一次 `BracketClosedHook.Current` 判空；
  两者删除前就恒为 `null`（0 赋值），因此解析产物逐字节不变——30 target 的 0 diff、5 smoke 的同一 SHA16、
  BuildCount 逐 case 零差异共同证明这一点。
- `ContainerShapeCatalog.Installed` 字段删除：仅探针可读，全仓无读取点（`typescript/cases` 亦无）。
- `SourceFileShape` 少一个 import 与一次空调用；`ContainerShapeCatalog` 的其余静态方法仍被候选使用。

## 6. 验收对照

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build` | 0 error | 0 error |
| `tsc -p .` | exit 0 | exit 0 |
| OFF 30 target | 29 / 1(026) / 0 / 0 | 29 / 1(026) / 0 / 0 |
| ON 30 target | 30 / 0 / 0 / 0 | 30 / 0 / 0 / 0 |
| 5 smoke SHA16 | 不变 | 全 `BB07DA2201FC5087` |
| BuildCount 逐 case | 与 `7fb5e6a3` 一致 | OFF 127 / ON 126，零差异 |
| grep 4 模式 | 0 | 0 / 0 / 0 / 0 |
| 保留项 | 不删不改 | `BracketRoleHook` / `ChildBracketCreatedHook` 等均保留 |
| 不 push / 不合并 / 不删目录 | — | 均未执行 |
