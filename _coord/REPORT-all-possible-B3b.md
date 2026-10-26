# REPORT-all-possible-B3b — B3 续任：function 声明族提前挂壳（+ 顺带变绿的 10 条）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | task-19 — WP-B3b（B3 续任，function 族优先） |
| 分支 | `feat/b3b`（只提交本地分支，**未 push origin**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b3b-decls`（`node_modules` = canonical 的 junction） |
| base | `base-b3` = `b3-declarations/feat/b3` @ `881816f4`；**已 merge `base-int`（`_integration/integration/all-possible`）**，merge commit `9c7e2503`（带进 A2/A4/B5/B6 等） |
| 依据 | `REPORT-all-possible-B3.md` §4.1（根因 + 继续方案）、`B1` 早挂壳机制、`PLAN-all-possible.md` §5 |

## 1. 验收读数（全部可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd:<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **577 文件 / 0 error / 3 warning**（3 条均为既有 `E1107`） |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | 迁移前 `node typescript/cases/tts/run.mjs --quiet --json tmp/after1.json` | 231 条：**PASS 212 / FAIL 19**；19 条全部 **NOW-SUPPORTED（→incremental）** |
| 4 | 非目标漂移（同一次 JSON 的 expected≠actual 且非 incremental） | **0 条** |
| 5 | `git mv` × 19 → `tts-impl/cases/<area>/` | 19 条（9 条 function 族目标 + 10 条随机制一起变绿，见 §3） |
| 6 | 迁移后 `node typescript/cases/tts/run.mjs --quiet` | **PASS 212 / FAIL 0 / 212，exit 0**（计数 `{"throw":92,"atomic":70,"partial":50,"incremental":0}`） |
| 7 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 213 / FAIL 0 / 213，exit 0**（194 集成基线 + 19 新增，全 `incremental`） |
| 8 | 同命令跑两遍 `--json` 的 SHA-256 | **逐字节相同**（确定性） |
| 9 | 开关 false 逐字节 legacy | 全部新逻辑都在 `IsIncrementalShapesEnabled()` 分支内；`Arm()` 在 false 时只按 `Armed` 恢复自己改过的 `EnableRootDeclarationShell`（首跑 `Armed=false` ⇒ 不动）。#6 的 legacy 半程由账本逐条对拍、exit 0；class 族既有 17 条仍 PASS（`class-empty` 实测） |
| 10 | EOF 树一致 | 账本 `incremental` 只在两模式 EOF shape 树（类名+pos）逐条相同时给出（`divergent` = FAIL），#3 的判定即证据 |

## 2. 实现（1 个新文件 + 1 个 own 文件 4 处门控改动；`FunctionDeclarationShape` 一行未改）

### 2.1 新增 `typescript/tokens/declarations/function-declaration-end-possible-shape.xl.md`

照 `class-declaration-end-possible-shape.xl.md`（51 行）的同一模式：`FunctionDeclarationEndPossibleShape`。

- `ComputeByIndex`：已闭合的函数体 `{`（且 `TypeBuilder.IsBodyBrace` 认定是体、不是返回类型里的对象字面量）
  / 已闭合的 `;`（declare / 重载签名）/ EOF 哨兵 ⇒ `Accept`；其余 `Reject`；
- `BuildByIndex`：把壳里的 raw 单元交给**同一批 legacy 建树函数** `FunctionDeclarationShape.FromUnits`，
  再 `BodyGuideUtil.FinishShell` 换回父单元。两个细节：
  - 用 `shell` 当 `host` 调 `FromUnits(shell, 0, lastCode, …)`，`fallbackPos = shell.Pos`，
    于是 `Pos` 与 legacy「前一个非 trivia 单元 EndIndex」逐位一致；
  - `ambient = 没有函数体`（declare / 重载签名按 ambient 口径建树）；EOF 哨兵从 `code` 尾巴剥掉。

**关键设计**：不改 `function-declaration-shape.xl.md`（525 行的 legacy 建树器）。壳里 `Data` 就是
`[function, …, 体/分号]`，`FromUnits` 本来就读 `host.Data[start..tokenIndex]`，所以把 `shell` 当 host 即可复用，
不需要像 class 那样另写 `BuildFromCode`。这也是 EOF 树能逐节点一致的原因（收口与 legacy 是同一份代码）。

### 2.2 改动 `function-declaration-possible-shape.xl.md`（4 处，全部门控）

1. `ComputeByIndex` 首行 `DeclarationIncrementalRoute.Arm();`（与 class 族同款；false 时只恢复不覆盖）；
2. **关键字格即 Done**：`Stage 0/6/8` 三处「见到 `function`」分支，只在增量模式设 `Done/DoneAt`；
   legacy 的 `DoneAt` 仍由体 `{` 那一格决定（`IsBuildable` 的 `DoneAt === tokenIndex` 口径不变）；
3. `IsBuildable`：增量模式返回 `Done && !Rejected`（关键字格即可挂壳），legacy 保持 `DoneAt === tokenIndex`；
4. `BuildByIndex`：增量模式 `new FunctionDeclarationShape` + `CatalogGuide([], FunctionDeclarationEndPossibleShape)`
   + `BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context)`；legacy 走下面原有整段建树，逐字节不变。

`async` / `function*` / 装饰器前缀都覆盖：壳从 `state.Start`（首修饰词）开始搬单元，`FromUnits` 认识
`declare/async/@` 前缀与 `*`，所以不需要在候选里再解析修饰词。

## 3. 结果：19 条 incremental（9 目标 + 10 顺带）

| 组 | case | 说明 |
| --- | --- | --- |
| function 族目标 | `function-basic`, `function-async`, `function-async-generator`, `function-default-param`, `function-generator`, `function-overload`, `function-rest-param`, `function-return-type`, `atomic/statements/expr-yield` | 9/9 达成（`--show`：`actual=incremental`，`earlier: FunctionDeclarationShape@pos=0`） |
| 顺带变绿（同一机制） | `return-no-value`, `return-value`, `stmt-async-function`, `function-param-return`, `function-predicate`, `function-this-param`, `await-expr`, `ref-new-target`, `yield-expr`, `function-body-let-close-brace` | 这 10 条在 legacy 里本来就是由 function 声明本体驱动的原子树；壳提前挂出后一并变绿，已迁 `tts-impl`（不迁则 `tts` 不 exit 0） |

**未达成（16 条）与交接**

| 族 | 数量 | 现状 / 原因 | 交接 |
| --- | ---: | --- | --- |
| enum / const-enum | 4 | `EnumDeclarationPossibleShape` 已有 `Arm()` 前置接线与现成 `enum-declaration-end-possible-shape`，但 enum 关键字**不在** `EnableRootDeclarationShell` 分支：需要按 B3 报告 §4.2 的 two-file 方案——在 `declaration-statement-possible-shape.xl.md` 的 `[XL-B5]` 之后追加 `[XL-B3]`、在 `control-flow-statement-possible-shape.xl.md` 的 B1 段之后追加同组 Reject（Lead 已授权只追加）。本轮预算用在了 function 族的实测收敛上，未动这两个共享文件 | **B3c**（约 1 轮：2 个文件各追加 1 段 + enum 候选照 function 的三处门控改） |
| module-shorthand / namespace-* | 4 | 除同样需要上面两个文件的追加外，`module-declaration-*` **没有 end possible**（需新建 `module-declaration-end-possible-shape.xl.md`，判 `{}` 体闭合 + `;`/EOF），并把 `ModuleDeclarationShape` 挂 CatalogGuide | **B3c** 第二半（约 1–2 轮） |
| declare-* | 7 | 变量三层 + `declare` 修饰 + 类型注解（A5/A6 面）；本分支已含 A2/A4 但 A5/A6 未合入 | A5/A6 完成后接 |
| `function-generic-export-default` | 1 | 根首词是 `export`，由 export 声明族（B5）接管；export 壳内部仍走 legacy 建 FunctionDeclaration | B5/B7（export 族壳内部改成 function 早挂壳时自然达成） |

## 4. 集成注记

1. **`DeclarationIncrementalRoute.Armed` 仍是进程级静态**：本 WP 与 class 族共用同一个 `Arm()`（调多次等价）。
   若 B7 改成多文档并发，请把它换成 per-context 状态（B3 报告 §6.2 已列）。
2. **`FunctionDeclarationPossibleShape.BuildByIndex` 的位置很关键**：增量分支必须在 `state.SplitDeclare` /
   `SplitAt` 这些 legacy 分支**之前**返回（已放在 `start > tokenIndex` 之后、`SplitDeclare` 之前）。
   后面若有人调整该函数结构，请保留这一顺序。
3. **返回类型里的对象字面量**：`{` 是否算终点用 `TypeBuilder.IsBodyBrace` 判（与 legacy 建树同一判据）；
   将来若 B4b 改类型目录，这条判据不要改成「任何闭合 `{`」。
4. **无分号 ambient 声明**（`function f(): B` 换行接下一个成员）在 target 里没有样本，本实现只在
   「`;` 闭合 / 体 `{` 闭合 / EOF」三种终点 Accept；若后续有此类 case，需要在终结候选里补 ASI 判据。
5. **迁移的 10 条「顺带」case** 属 function 声明本体驱动（B3 已对 4 条 class/types 同款处理，见其 §5.1）；
   B7 汇总时把它们记在本 WP 名下，不要重复计入其他 WP。

## 5. 风险

1. **静态开关的路由副作用面**：`Arm()` 改 `EnableRootDeclarationShell`（全局）。本 WP 的 false 分支与 B3 相同
   （只在 `Armed` 为真时恢复）。已用账本 legacy 半程逐条对拍 + exit 0 证明无泄漏；若以后在 Decide 的
   function/class 分支再加判据，需要重跑 stale 检查（B3 的 `tmp/stale-check.mjs` 模式）。
2. **壳提前挂出后成员/参数由 legacy 在收口时一次建**：`FunctionDeclarationShape.FromUnits` 在收口时用
   `TypeBuilder` / `StatementBuilder` 建参数与体（与 legacy 同源），因此参数/体内部的节点**不会提前**。
   账本判据只看「有节点 strictly earlier」⇒ 只要 `FunctionDeclarationShape` 本身提前就是 incremental，
   这一点已由 19 条实测确认；但若将来有人把「参数/体也提前」当成验收标准，需要另接 BodyGuide（不在本 WP）。
3. **EOF 哨兵路径未覆盖真实样本**：`EndOfFileTokenShape` 分支是防御性的（BF 里没有无分号 ambient 根声明）。
   若 B3c 遇到，需补测。
4. **`src`/trivia 缺陷**仍归 B6（本 WP 未改任何 src 口径；`MountShell` 起点用 `consumed[0].SourceRange.StartIndex`，
   与 class 一致，不吸前导 trivia）。

## 6. 复算命令

```powershell
xl_build { cwd: "<本克隆>", paths: ["core","typescript"], targets: ["ts"] }   # 577 / 0 error
node node_modules/typescript/bin/tsc -p .                                      # exit 0
node typescript/cases/tts/run.mjs --quiet                                      # PASS 212 / FAIL 0
node typescript/cases/tts-impl/run.mjs --quiet                                 # PASS 213 / FAIL 0
node typescript/cases/tts/run.mjs --show atomic/declarations/enum-numeric       # 仍 atomic（B3c）
node typescript/cases/tts/run.mjs --show atomic/declarations/namespace-basic    # 仍 atomic（B3c）
```