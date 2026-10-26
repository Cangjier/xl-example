# REPORT-all-possible-B3f — declare 声明族续任（declare-namespace / declare-global / declare-module-string 达成）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | task-33 — WP-B3f（declare 族收尾） |
| 分支 | `feat/b3f`（只提交本地分支，**未 push origin**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b3f-declare`（`node_modules` = canonical junction） |
| base | `base-int` = `_integration/integration/all-possible` @ `187768ce`（含 B3c / A5c / A6c：tts-impl 基线 365 全 PASS） |
| 依据 | `b3d-declare/REPORT-all-possible-B3d.md` §4、`b3c-enum-module/REPORT-all-possible-B3c.md` §2.3、B3b/A6c 报告 |

## 1. 验收读数（可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd:<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **595 文件 / 0 error / 3 warning**（既有 E1107） |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | 迁移前 `tts/run.mjs --quiet --json` | 60 条：**PASS 57 / FAIL 3**，3 条全为 NOW-SUPPORTED；**非目标漂移 0**（declare-function / declare-const / declare-let / declare-var / export-declare-const 均保持 atomic） |
| 4 | `git mv` × 3 → `tts-impl/cases/declarations/` | `declare-namespace`、`declare-global`、`declare-module-string` |
| 5 | 迁移后 `tts/run.mjs --quiet` | **PASS 57 / FAIL 0 / 57，exit 0**（`{throw:41,atomic:11,partial:5,incremental:0}`） |
| 6 | `tts-impl/run.mjs --quiet` | **PASS 368 / FAIL 0 / 368，exit 0**（365 基线 + 3） |
| 7 | 两次独立 `tts --json` SHA-256 | **逐字节相同** |
| 8 | 开关 false | 全部新逻辑在 `IsIncrementalShapesEnabled()` 内；`Arm()` false 时只恢复自己改过的路由位；账本 legacy 半程逐条对拍 exit 0 |

## 2. 实现（4 个文件改动，无新文件）

### 2.1 `module-declaration-possible-shape.xl.md`（B3c 的 `Done` 口径扩展）

- 让位判据（`ShouldYieldToDeclarationShell` 分支里的 `b3cOwns`）新增 `declare` 头：第二个代码单元 ∈ {`namespace`,`module`,`global`} ⇒ 本候选接管（不再让位给通用声明壳）；
- `Done` 判据的声明词集合新增 `global`（`declare global { … }` 无 namespace/module 关键字，名字就是 global）。
- 收口仍走 B3c 已建的 `ModuleDeclarationEndPossibleShape`（`ModuleDeclarationShape.FromUnits` + `FinishShell`），EOF 树与 legacy 同源。

### 2.2 `declaration-statement-possible-shape.xl.md` / `control-flow-statement-possible-shape.xl.md`（`[XL-B3f]` 追加段）

增量模式下，`head = declare` 且第二个代码单元 ∈ {`namespace`,`module`,`global`} ⇒ `Reject`（让位给 module 候选）。
**`declare function` 与 `declare const|let|var` 有意不在本段**（理由见 §3）。两处只追加、不重排。

### 2.3 `function-declaration-end-possible-shape.xl.md`（B3d 交接的「零宽 `;`」修法落地，暂作地基）

`FinishShell` 之后清理父单元里**零宽同名 `;`**（`Symbol(";")` 且 `src=[x,x)`、左右端点相等）的残片 ——
这是 B3d 报告的 divergent 根因。同时修掉了一处 TS 2367（`Symbol` 与 `FunctionDeclarationShape` 无重叠比较）。
本 WP 未启用 `declare function` 让位，所以该路径当前不进入；它是下游 WP 的现成修法（见 §3.1）。

## 3. 未达成（4 条）与根因 / 交接

### 3.1 `declare-function`（1 条，根因已精确定位到第 2 层）

- **第一层（B3d 报的零宽 `;`）**：已在 §2.3 修好（不在本 WP 启用，仅备好）。
- **第二层（本次新定位）**：`FunctionDeclarationPossibleShape.ComputeByIndex` 开头的
  `ShouldYieldToDeclarationShell` 在 `declare function` 的 `function` 格就返回 true ⇒ 本候选被 `Reject` 杀掉，
  `state.Done` 永远设不上，壳只能拖到 EOF 由兜底路径挂出（这就是 B3d 看到的「root 级 `;` 残片」的来源）。
  与 module 候选的 `b3cOwns` 同一修法：**在该处对「head=declare 且第二词=function」跳过让位**（约 10 行，位置在
  `function-declaration-possible-shape.xl.md` 的 `ComputeByIndex` 首部），再把 `declare function` 加回
  §2.2 的两处 Reject 集合即可。本轮未做：`function-declaration-possible-shape.xl.md` 不在本 WP 已读/已改文件面内，
  且预算已到（见 §5）。

### 3.2 `declare-const` / `declare-let` / `declare-var`（3 条）

现状：两模式都 atomic（通用声明壳收口）。要变 incremental 需要「`declare` 修饰 + 变量三层」的早挂壳：

1. `declaration-statement` / `control-flow` 对 `declare`+{`const`,`let`,`var`} 让位（同 §2.2 的手法）；
2. **新增** `declarations/forms/declare-variable-possible-shape.xl.md`：在 `declare` 格 `MountShell` 一个
   `VariableStatementShape` 壳（`Pos`/类名照 legacy），壳里挂 `VariableDeclarationListPossibleShape`（A6c 已有）
   / `VariableDeclarationEndPossibleShape`；
3. 变量增量 builder（`IncrementalVariableStatementBuilder`）当前只认 `let|const|var` 头（`declare` 前缀会进
   「declaration 符号 declare」拒绝路径），需要给它加「`declare` 前缀消费」；类型注解走 A5 `TypeCatalogFactory`；
4. 收口：`VariableStatementThreeLayer` / legacy `StatementBuilder.BuildDeclareVariableStatement` 同源调用。

建议作为 **B3g**（或 A6 收尾）单列，目标 3 条 + 顺带 `export-declare-const`（export 族内部同机制）。

### 3.3 `export-declare-const`（1 条）

root head 是 `export`，由 B5 export 族 shell 接管；要等 §3.2 的 declare-variable 机制就绪后，在
`import-export-declaration-mount` 里对 `export declare const` 让位。

## 4. 集成注记

1. **让位判据三处必须同源**：`module-declaration-possible-shape` 的 `b3cOwns`、`declaration-statement` 的
   `[XL-B3f]` 段、`control-flow` 的 `[XL-B3f]` 段 —— 三者条件不一致就会「同格双 Accept」或「无人建壳」。
   已按同一份 `declare`+{namespace,module,global} 条件落地，后续 WP 扩展时请同时改三处。
2. `declare` 与族头**换行**（`declare` ⏎ `namespace`）在 TS 是两条语句：module 候选已有的换行判据
   （`ExpressionStatementPossibleShape.HasLineBreak`）仍在让位之前生效，本 WP 未改。
3. `function-declaration-end-possible` 的零宽 `;` 清理对真实空语句（src 有宽度）不动，且已在 368 条 tts-impl
   全绿上验证零漂移。

## 5. 风险 / 预算

- 静态 `DeclarationIncrementalRoute.Armed` 仍是进程级（与 class/function/module 共用 `Arm()`）。
- **轮次**：约 10 轮（一次 `xl_build`/`tsc` 的顺序问题 + 一次「未读文件不能改」各多花一轮）；单次 commit。
- 未运行既有 gates；未 push；未改 INDEX（归 A7/B7）。

## 6. 复算命令

```powershell
xl_build { cwd: "<本克隆>", paths: ["core","typescript"], targets: ["ts"] }   # 595 / 0 error
node node_modules/typescript/bin/tsc -p .                                      # exit 0
node typescript/cases/tts/run.mjs --quiet                                      # PASS 57 / FAIL 0
node typescript/cases/tts-impl/run.mjs --quiet                                 # PASS 368 / FAIL 0
node typescript/cases/tts-impl/run.mjs --show declarations/declare-namespace   # actual=incremental
node typescript/cases/tts/run.mjs --show atomic/declarations/declare-function  # 仍 atomic（B3g）
```