# REPORT-all-possible-B3c — enum / module / namespace 收尾（+ 1 条 enum 顺带）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | task-23 — WP-B3c（enum / const-enum / module / namespace 提前挂壳） |
| 分支 | `feat/b3c`（只提交本地分支，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b3c-enum-module`（`node_modules` = canonical junction） |
| base | `base-b3b` = `b3b-decls/feat/b3b` @ `81334029`；**已 merge `base-int`**（`_integration/integration/all-possible` @ `facaafcd`），fast-forward，无冲突 |
| 依据 | `REPORT-all-possible-B3b.md` §3「enum/module 交接」、`REPORT-all-possible-B3.md` §4.2、B1 早挂壳机制、B5 §5.1 |

## 1. 验收读数

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd:<克隆>, paths:["core","typescript"], targets:["ts"]}` | 首次 **588 written / 0 error / 3 warning**（既有 E1107）；增量 1–5 written / 0 error |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | 迁移前 `node typescript/cases/tts/run.mjs --quiet --json tmp/b3c-3.json` | 130 条：**PASS 122 / FAIL 8**，8 条全部 `atomic→incremental`（0 divergent / 0 invalid / 0 regression） |
| 4 | `git mv` × 8 → `tts-impl/cases/{declarations,types}/` | 迁移后 `node typescript/cases/tts/run.mjs --quiet` → **exit 0，122 条全 PASS**（计数 `{"throw":92,"atomic":14,"partial":16,"incremental":0}`） |
| 5 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 300 / FAIL 3**（295 集成基线 + 8 新增；3 条红是**集成基线既有**，见 §5） |
| 6 | 两次独立 `tts --json` | SHA-256 逐字节相同（确定性） |
| 7 | 开关 false 逐字节 legacy | 所有新逻辑都在 `IsIncrementalShapesEnabled()` 分支内；tts 的 legacy 半程逐条对拍（#4 exit 0）即证；enum/module 候选的 `ShouldYield` 让位判据在 false 时与原代码逐字节相同 |

## 2. 实现（1 个新文件 + 2 个候选门控 + 3 个共享文件「只追加不重排」）

### 2.1 让位段（two-file 方案，B3b 交接方案）

`enum` / `namespace` / `module` 在 `Decide` 里落 `ShellDeclarationFamily`，会被**通用声明壳**接走（atomic 的根因）。
按 B3b §3 的 two-file 方案追加：

1. `typescript/tokens/statements/declaration-statement-possible-shape.xl.md`（`[XL-B5]` / `[XL-B4a]` 段之后）：
   `[XL-B3c]` 段——增量模式且首词 ∈ {enum, namespace, module} 时 `Reject`；
2. `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`（B1 段之后）：同一判据的
   `[XL-B3c]` 段（本候选也认 `ShellDeclarationFamily`，不让位会同格双 Accept）。

### 2.2 enum：候选门控 + 挂 CatalogGuide

`enum-declaration-possible-shape.xl.md`（B3 已加 `Arm()` 与 `Done` 口径）：

- 让位判据改为「legacy 照旧让位；增量模式只对**自己的头**（`enum` / `const enum`）跳过让位」——
  `declare enum` 等仍让位，否则会与通用声明壳同格双 Accept（实测 `declare namespace/module/global`
  会抛「终结候选与其它候选同时成立」，已修）；
- `BuildByIndex` 增量分支：`BodyGuideUtil.MountShell(...)` 挂出 legacy 类名的 `EnumDeclarationShape`，
  并 `shell.CatalogGuide = new CatalogGuide([], new EnumDeclarationEndPossibleShape())` —— 终结候选
  （B3 已现成）在 `{}` 体闭合格用 `EnumDeclarationShape.BuildFromCode` + `FinishShell` 收口，与 legacy 同源。

### 2.3 module / namespace：沿用 function 的 end-possible 模式

- **新增** `typescript/tokens/declarations/module-declaration-end-possible-shape.xl.md`（照
  `function-declaration-end-possible-shape.xl.md` 的同一模式）：`ComputeByIndex` 认「已闭合 `{}` 体括号 /
  已闭合 `;`（无体 ambient module）/ EOF」；`BuildByIndex` 用 `ModuleDeclarationShape.FromUnits(code, positions, context)`
  收口 + `BodyGuideUtil.FinishShell`。`positions` 从 `shell.Pos` 起按 C1 口径逐单元推。
- `module-declaration-possible-shape.xl.md`：
  - `ModuleDeclarationScan` 新增 `Done` / `DoneAt`；`ComputeByIndex` 在「声明头（namespace/module，可带
    export 修饰）与名字同格到齐」时记 Done（跳过 export/declare 前缀后判关键字；`declare namespace|module|global`
    不记 Done —— 那是 A5/A6 面，继续让位）；
  - 让位判据同 enum：增量模式只对自己的头（`namespace` / `module` / `export namespace|module`）跳过让位；
  - `IsBuildable`：增量模式 `Done && Status!==2`；legacy 保持 `Status===1 && End>=0`；
  - `BuildByIndex`：增量模式 `ModuleDeclarationShape` + `BodyGuideUtil.MountShell` +
    `CatalogGuide([], new ModuleDeclarationEndPossibleShape())`；legacy 走原有 `FromUnits` 整段建树。

### 2.4 `const enum` 的第三条让位（B3b two-file 方案未覆盖）

实测 `const enum` 的 `Decide` 路由是 `ShellPlainExpr → ShellVariable → Legacy`（`const` 不在绑定位），
**不经过** `ShellDeclarationFamily`，two-file 让位覆盖不到。因此在
`typescript/tokens/statements/statement-possible-shape.xl.md`（Legacy 路由候选）追加 `[XL-B3c]` 段：
增量模式 + route Legacy + 首词 `const` + 下一代码单元 `enum` ⇒ `Reject`，让位给 enum 候选。
（同两处「只追加不重排」；false 时不执行。）

## 3. 迁移清单（8 条，全部 `--show` = incremental）

- `tts-impl/cases/declarations/`：`enum-computed`、`enum-numeric`、`enum-string`、`module-shorthand`、
  `namespace-basic`、`namespace-export-function`、`namespace-nested`（7 条目标）
- `tts-impl/cases/types/`：`enum-string`（`atomic/types/enum-string`，与 declarations 那条不同文件；
  同一机制连带解锁。不在 task-23 清单，按 B3/B3b 先例一并迁走并在本报告备案，B4b-ii 汇总时从目标扣除）

已达 **8/9**（目标清单含 const-enum 共 9 个文件；`atomic/declarations/const-enum` 未达成，见 §4）。

## 4. 未达成：`const-enum`（重要发现，交接）

`const enum E { A }` 当前两模式都是 `atomic`，根因**不是**路由，而是：**legacy 路径本身**的
`EnumDeclarationPossibleShape` 在 `enum` 关键字格就已经 `Done` 并提前建出 `EnumDeclarationShape`
（`ShouldYield` 对 `ShellVariable/Legacy` 路由为 false，故 legacy 下枚举候选也提前建树）。
增量模式最多只能同格建出 ⇒ 时序与 legacy 相同 ⇒ 账本判 `atomic`。

把它变 `incremental` 的唯一方向是**在 `const` 那一格就挂壳**（比 legacy 的 `enum` 格早一格）。实测风险：

- `const` 格同时是 `VariableStatementPossibleShape` 的 `ShellVariable` Accept 格；要提前挂壳必须让
  变量声明候选对「`const` + 下一词 `enum`」在增量模式让位（改 `variable-statement-possible-shape`，A6 面）；
- 若 enum 候选在 `const` 格 Accept 而下一词不是 `enum`，它必须在后续格 Reject —— 但 Accept 不建树时
  另一候选已被拖住，所有 `const` 变量声明的时序都会漂移 1–2 格（整批 A6/A1 case 回归风险）。

本 WP 未采用（预算内无法证明零漂移），交接 **A6/B7**：先让变量候选对 `const enum` 让位，再在 enum 候选
新增「`const` 格提前 Done」的增量分支；届时 `const-enum` 可直接迁 `tts-impl/cases/declarations`。

## 5. 集成基线 3 条红（非本 WP 引入）

合并 `base-int`（facaafcd）后、**本 WP 改动之前**的 `tts-impl` 基线里就有 3 条 partial：

`declarations/let-comparison-init`、`expressions/bin-div`、`expressions/bin-instanceof`。

证据：本 WP 的改动全部门控在 `IsIncrementalShapesEnabled()` + `enum/namespace/module/const-enum` 头，
不触碰变量声明/运算符路径；且这 3 条在迁移前后同上同下。归 A2/A4 收尾：`bin-div`/`bin-instanceof`
需要 A2 的 `/`、`instanceof` 运算符片段，`let-comparison-init` 同类。合并者按「集成基线既有」处理。

## 6. 风险 / 合并注意

1. **`declaration-statement` / `control-flow` / `statement-possible-shape` 三个共享文件只做了追加**，锚点为
   `[XL-B3c]`；合并时若 A6/B7 也追加同文件，按 WP id 排序、勿重排。让位条件只认
   `enum | namespace | module`（enum 额外认 `const`+`enum`），刻意不含 `declare *`。
2. **module 的 Done 口径**只认「头 + 名字同格到齐」，不认 `declare` 前缀；module 的 legacy `Scan` 语义未改。
3. **`const enum` 的 legacy 提前建树**是既有行为（本 WP 未改）；若后续有人在 enum 候选加判据，请记住
   legacy 这一侧同样走该候选（`ShouldYield` 对 ShellVariable/Legacy 为 false）。
4. `ModuleDeclarationEndPossibleShape` 的 `positions` 口径 = legacy BuildByIndex 的同一算法（首单元用壳 `Pos`）。
5. 未跑既有 gates；未 push；未改 INDEX（归 A7/B7 重生成）。

## 7. 复算命令

```powershell
xl_build { cwd: "<克隆>", paths: ["core","typescript"], targets: ["ts"] }   # 588 / 0 error
node node_modules/typescript/bin/tsc -p .                                    # exit 0
node typescript/cases/tts/run.mjs --quiet                                    # 122 条全 PASS
node typescript/cases/tts-impl/run.mjs --quiet                               # PASS 300 / FAIL 3（基线既有）
node typescript/cases/tts-impl/run.mjs --show declarations/enum-numeric      # actual=incremental
node typescript/cases/tts-impl/run.mjs --show declarations/namespace-nested  # actual=incremental
node tmp/probe-route.mjs typescript/cases/tts/cases/atomic/declarations/const-enum.ts  # 路由证据
```
