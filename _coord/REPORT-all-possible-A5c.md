# REPORT-all-possible-A5c — 修 `generic-call-type-args` 回归（tts-impl 唯一 FAIL）

## 0. 身份与结论

| 项 | 值 |
| --- | --- |
| 任务 | 任务板 id = **`task-29`**（WP-A5c；Lead 消息里写的 `task-30` 在板上是 WP-B3d，我按板上的 A5c 条目 claim） |
| 分支 | `feat/a5c`（只提交本地分支，**未 push**），复用工位 `C:\Users\Admin\Documents\GitHub\xl-example-set\a7-sweep` |
| base | `base-int` = `_integration/integration/all-possible` @ **`b06b3104`**（A5 INDEX 重生成之上，源码与 `d5058aec` 相同） |
| commit | `079e7caa` — `fix(a5c): type-argument call f<string>() yields back to A5 type face instead of A2 binary`（+ 本报告 commit） |
| 改动 | 3 个 `.xl.md`，**220 行纯新增、0 删除**：`primary-atom-guard` / `binary-operator-possible-shape` / `variable-declaration-end-possible-shape` |
| 结论 | 目标 case 恢复 `incremental`；`tts-impl` **336 / 336 PASS（FAIL 0）**；`tts` 89/89 且**零漂移** |

## 1. 验收读数（可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<工位>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**，3 warning（既有 `E1107` 三处） |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts-impl/run.mjs --show types/generic-call-type-args` | **`actual=incremental`**，`earlier: CallExpressionShape@pos=9, IdentifierShape@pos=9, StringKeywordShape@pos=12` |
| 4 | `node typescript/cases/tts-impl/run.mjs` | **PASS 336 / FAIL 0 / 336，exit 0**（`incremental 336`，唯一的 throw 已消失） |
| 5 | `node typescript/cases/tts/run.mjs` | **exit 0**；分类计数 `throw 63 / atomic 22 / partial 4`（与基线逐字段相同：脚本对比 **changed 0**） |
| 6 | 两次独立进程 `--json`（两个 suite 各两次） | **逐字节相同**（确定性保持） |
| 7 | 回归前基线（同一工位、未改代码时） | `tts-impl` 336 条：`incremental 335 / throw 1`、FAIL 1；`tts` 89 条 FAIL 0 |

**零漂移证据**：脚本逐条比较两份 `--json` 的全字段（actual/reason/steps/earlierNodes/residualBasicLines/…）——
`tts` **changed 0**、`tts-impl` **changed 1（就是目标 case：throw → incremental）**。

## 2. 根因（这是三个 WP 合并后的交互，不是单点 bug）

```text
const x = f<string>()
          ↑ A1b：PrimaryAtomGuard.ContinuationChars 含 '<' ⇒ A1 认为「`<` 有消费面」，提前把 f 物化成 IdentifierShape
          ↑ A2 ：BinaryOperatorPossibleShape 在 `<` 格 Accept（左操作数已是形状）⇒ 建 BinaryExpressionShape('<')，
                 并挂上「只认数字」的 RightOperandPossibleShape.Catalog()
          ↑ `string` 格：右操作数目录没有候选能构造 ⇒ CatalogGuide: 没有候选形状可以构成（宿主 BinaryExpressionShape，下标 2）
```

而 A5 的类型面（`VariableDeclarationShape.ComputePossibleShapes` → TypeMode →
`TypeCatalogFactory.ParseInitializer`）**要求初始化器里还没有已建形状**（只吃 basic 单元），
被 A1 提前物化的 `f` 一挡就不接管了。只让 A2 退让还不够：`>` 那一格会落到
`VariableDeclarationEndPossibleShape` 的「未支持符号」显式 throw（实测报 `declaration 符号 >`）。

## 3. 修法（三处，都是「让位」而不是新写建树）

1. **`expressions/forms/primary/primary-atom-guard.xl.md`（A1b 面）**
   - 新增文档前瞻 `IsTypeArgumentCallAt(document, at)`：从 `<` 起找配对 `>`，跳过其后空白，**紧跟 `(`** 才算类型实参调用；
   - 新增 `IsTypeArgumentCallAfter(unit)`（与既有 `IsDivisionAfter` 同款：`ComputeByIndex` 拿不到 context，读
     `SourceRange.CurrentDocument`）；
   - `IsTerminalAfter` 在「续接字符是 `<` 且是类型实参调用」时返回 `false` ⇒ A1 不提前物化 callee 原子，
     把初始化器留成 basic 单元，A5 的类型面才能接管。
2. **`expressions/forms/operator/binary-operator-possible-shape.xl.md`（A2 面）**
   - `ComputeByIndex`：`text === "<"` 且是类型实参调用 ⇒ `Reject`（**A2 让位**）；
   - `IsBuildable`：同一条判据 ⇒ `false`（避免 Uncertain 被误建）。
3. **`declarations/variable-declaration-end-possible-shape.xl.md`（**超出 task 声明写域，已在 commit/本报告注明**）**
   - `HasOpenTypeArgument(units, tokenIndex)`：`=` 之后 `<` 比 `>` 家族多（**只数到当前格之前**——当前格就是那个 `>` 时
     列表还没闭合）；
   - 符号分支：类型实参列表内部的 `>` / `>>` / `>>>` ⇒ `Reject`（不再 `declaration 符号 >`）；
   - 括号分支：`(` 括号且 `HasTypeArgumentCall(units)` ⇒ `Reject`（不再 `declaration 括号`），把整段交回 A5 的类型面。
   - `HasTypeArgumentCall` 在本地实现一份（与 `TypeCatalogFactory.HasTypeArgumentCall` 同判据）是为了避免
     `types/type-catalog-factory` ↔ `declarations/*` 的导入环；两处必须保持同步（已写进方法注释）。

**为什么不会破已迁 case**：三处判据都要求 `<` 之后**确有配对 `>` 且紧跟 `(`**——`1<2`、`a < b`、
尖括号断言 `<T>y`（`>` 后不是 `(`）、`as`/`satisfies`、A1b 的 `/` 例外与其它续接字符都不命中。
实测两个 suite 全字段零漂移（§1#5/#7）就是这条的机械证据。

## 4. 风险 / 注意

1. **文档前瞻是字符级**（与 `PrimaryAtomGuard.IsDivisionAfter` 同口径）：不跳过字符串 / 模板里的 `<`。
   触发条件很窄（`<` 起、配对 `>` 后紧跟 `(`），在 A2/A5 已迁形态里实测无命中；若后续出现字符串里的
   假类型实参，建议把前瞻升级成 token 级（需要 `CatalogGuide.ComputeByIndex` 传 context，属 E-base 契约变更）。
2. **`variable-declaration-end-possible-shape.xl.md` 不在 task-29 声明的写域里**：它是「`>` 那一格」的唯一
   throw 点，只让 A2 退让无法修复（实测改前报 `declaration 符号 >`）。改动是**纯放行**（三处 `if` + 三个静态判据，
   0 删除），可整段回退。若 Lead 认为它属于 A6/A5 的写域，请按「放行判据迁移」处理。
3. **两份 `HasTypeArgumentCall` 同判据**（`TypeCatalogFactory` 与 `VariableDeclarationEndPossibleShape`）：
   改一处必须改另一处（避免 import 环）。已在两处方法注释里互相点名。
4. Lead 提到的「tts 标注漂移 `throw/declarations/let-arrow-init` → partial」：在我 fetch 到的
   `b06b3104` 上**没有出现**（tts 89 条 exit 0、无 FAIL），以该状态为准。
5. 未跑既有 gates；未 push；未改 README/INDEX；case 不做任何迁移（目标 case 本来就在 `tts-impl`）。

## 5. 复算命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\a7-sweep
xl_build { cwd: ".", paths: ["core","typescript"], targets: ["ts"] }
node node_modules/typescript/bin/tsc -p .
node typescript/cases/tts-impl/run.mjs --show types/generic-call-type-args   # 期望 actual=incremental
node typescript/cases/tts-impl/run.mjs --quiet --json tmp/impl-final1.json   # 期望 exit 0（336/336）
node typescript/cases/tts/run.mjs --quiet --json tmp/tts-final1.json         # 期望 exit 0（89/89）
```
