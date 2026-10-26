# B0c · `DeferredBracketCatalog.Bind` / `Replay` 所有权与顺序修复 — 实施报告

| 项 | 值 |
| --- | --- |
| 状态 | **完成**：`Bind(owner)` 先 replay 后摘条目，plan 随条目进 replay；合成探针 `ReplayCount=1 / ReplayFailureCount=0` |
| 分支 | `feature/b0c-deferred-fix` |
| 目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b0c-deferred-fix` |
| 基线 | 主仓库克隆时的 HEAD `b6bd50aa`（B1 `8234d086` 与 B2 `b6bd50aa` 已合入；任务书写的 `6a60c206` 已被这两个 merge 推进） |
| 提交 | `git log --oneline -1`（提交信息 ASCII） |
| 范围 | 只修 B0a 的 Deferred 生命周期 + 计数；**不迁任何 site**，B1/B2 的 AST 判据一行未动 |

---

## 1. 根因（B2 §3 #5）

B0a 的 `Bind(owner)` 在调 `Replay` **之前**就把命中条目 `Drop` 出 `Pending`：

```text
Bind: for (entry of claimed) Drop(entry.Bracket)   // 先删
      Replay(bracket, context)                     // 后 replay
Replay: entry = Find(shape)                        // 恒为 null（刚被删掉）
        plan  = entry?.Plan                        // 恒为 null
        BuildGuide(null) === null                  // 必然拒绝
        ReplayFailureCount += 1，return -1
```

所以只要有人真的登记 Deferred 条目（B3 的控制流头 / 声明族），replay 一次也不会成功，
而 `ReplayCount` 永远是 0、`ReplayFailureCount` 只会在失败出口上涨——B2 的「`ReplayFailureCount` 恒 0」
只是因为 B2 的路径根本没有 replay，属于**假绿**。

**复现证据（同一合成路径，跑在修复前的 bundle `xl-example/build/ts` 上）**：
`tmp/probe-before.mjs` 输出
`matched=0, replayCount=0, replayFailureCount=1, pending=0, bracketReplayCount=0, catalogGuide=null, candidateBuilds=0`。

---

## 2. 修复

文件：`typescript/tokens/statements/deferred-bracket-catalog.xl.md`（主修）、
`typescript/tokens/statements/statement-route-util.xl.md`（只加一个只读计数字段）。

### 2.1 所有权与顺序

- `Bind(owner)` 把命中的条目装进**本次 replay 计划** `claimed`（本地数组），**不再先 `Drop`**；
  条目在 replay 期间**仍留在 `Pending`**（`Find` 也仍找得到）。
- `Replay` 新增可选第三形参 `plan?:BracketRoleResult | null`（A1 §2.3 契约的
  `Replay(bracket, context)` 不破：两参调用仍走 `Find` 回落）。
  计划解析顺序：**显式形参优先**（`Bind` 从条目带来的所有权）⇒ 其次 `Find(bracket)`。
- `Replay` 返回之后 `Bind` 才 `Drop`：`>= 0` = 一次性消费；`< 0` = 显式丢弃。
  不半装：`Replay` 失败分支仍把 `CatalogGuide` 撤回 `null`（R6），R2/R4/R5 失败发生在
  写 `CatalogGuide` 之前。
- 文档里把「先 `Drop` 再 `Replay`」写成**禁式**，并说明任何摘条目只允许发生在
  `Replay` 返回之后（`Bind`）或失败分支（R6）。

### 2.2 硬规则保持

| 规则 | 保持方式 |
| --- | --- |
| R1 一次性 | `shape.ReplayCount > 0` 直接返回 0；本次成功即 `Drop`，重复 `Bind` 无条目可命中 |
| R2 只对 raw | 不变：`IsRaw` 见到 `!IsBasicToken && !IsTriviaToken` 就拒绝，写向导之前 |
| R3 升序 | 不变：`for (let at = 0; at < total; at++)`，`total` 先快照，不回头 |
| R4/R5 | 不变：`BuildGuide` 的终结候选项必须是 `WaitingEndPossible`；丢 `context` 拒绝 |
| R6 失败不半装 | 不变：先建到本地 `guide`，循环抛错 ⇒ `CatalogGuide = null` + `Drop` |
| R7 防自我重入 | 不变：`Replaying` 期间 `Replay` / `Bind` 一律空返回；条目留到外层结束 |

### 2.3 真实读数

`DeferredBracketCatalog` 新增 `ReplayDropCount`（`Drop` 每真正摘掉一条 +1，重复 `Drop` 不虚增），
`Report()` 末尾追加 `dropped=`；`StatementRouteUtil` 新增同口径镜像 `BracketRoleReplayDropCount`
（B0/B3/BF 的审计面）。三者的关系是可核对的：

- `ReplayCount == 0 && ReplayDropCount > 0` ⇒ 条目全在失败出口被消费（不允许当绿）；
- `ReplayCount == ReplayDropCount` ⇒ 每条都是成功一次性消费。

---

## 3. 合成探针（`tmp/probe-deferred.mjs`，未提交；`tmp/` 已 gitignore）

不注册任何真 site、不跑解析，只用 `Bracket + Common + 假 PossibleShape + 假 owner` 走
`RegisterWithKey → Bind(owner) → Replay` 那条被 B2 指出的路径：

| 阶段 | 断言 | 读数 |
| --- | --- | --- |
| 1 成功路径 | `Bind` 返回 1；`ReplayCount>0`；`ReplayFailureCount==0`；`ReplayDropCount==1`；`Pending==0`；`CatalogGuide !== null`；候选至少建一次 | `ReplayCount=1 / failed=0 / dropped=1 / binds=1` |
| 1 重复 Bind | 返回 0；`ReplayCount` 仍 1；`ReplayDropCount` 仍 1 | 不重复 replay、不重复 drop |
| 2 失败路径（R2 非 raw） | `Bind` 返回 0；`ReplayFailureCount==1`；`ReplayCount==0`；`ReplayDropCount==1`；`Pending==0`；`CatalogGuide===null`；候选 0 次 | `replayed=0 / failed=1 / dropped=1`，无半装 |
| 3 自我重入（R7） | 候选 `BuildByIndex` 里再 `Bind` 返回 0，条目此刻仍在 `Pending`；外层仍成功消费一次 | `ReplayCount=1 / failed=0 / dropped=1` |
| 4 `Reset` | 三个计数与 `BindCount` / `Pending` 全 0 | 无假零 |

最终行：`PROBE PASS: replay runs (>0), no failures, each entry consumed exactly once, repeat Bind is a no-op`
（exit 0）。失败路径的读数证明计数器是**真的**：非 raw 时 `failed=1`，而不是「永远 0 失败」。

---

## 4. 验收读数（同一 bundle：`xl_build` 628 页 0 error → `tsc` exit 0 → 下列套件）

| 套件 | 基线（任务书 / B2） | 本分支 |
| --- | --- | --- |
| `tshape-judge ts-all` | 426 ok / 0 moved / 3 err / 0 structural / 0 fields | **426 ok / 3 err / 0 diff**（3 条仍是 `class-ball` / `expression-zoo` / `generic-container` 的 `incremental-error`，逐条同名；`diff-status-count=0` ⇒ moved/structural/fields 全空） |
| `tts run.mjs --quiet` | PASS 429（throw 3 / incremental 426） | **PASS 429**（throw 3 / incremental 426），exit 0 |
| `tts-impl run.mjs --quiet` | PASS 0 | PASS 0，exit 0 |
| `xl_build` | 0 error | **0 error**，3 条既有 E1107 warning（与 B2 基线一致，未新增） |
| `tsc -p .` | exit 0 | **exit 0** |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 PASS / 0 FAIL / 7 N/A**，exit 0 |
| 合成探针 | — | **PASS**（§3） |

P1 示例与 B1/B2 的 AST 判据未动：3 个 err 用例与基线逐条同名，0 条 `diff`，
`BracketRoleReplay*` 在真解析里仍不触发（本 WP 不登记 site，默认开关关）。

---

## 5. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b0c-deferred-fix"
Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }
node node_modules/typescript/bin/tsc -p .

node tmp/probe-deferred.mjs        # 合成探针：ReplayCount>0 / ReplayFailureCount==0 / 一次性消费
node tmp/probe-before.mjs          # 修复前对照：读主仓库 build/ts，replayCount=0 / failure=1

node typescript/cases/tts/tools/tshape-judge.mjs ts-all --out tmp/ts-all-b0c.json
node typescript/cases/tts/run.mjs --quiet
node typescript/cases/tts-impl/run.mjs --quiet
node tests/gates/run.mjs
```

---

## 6. 未做 / 边界

1. **不迁 site**：没有给任何 `Deferred` 的 `Resolve` 结果接 `Bind`；B3 的控制流头 / 声明族
   仍按原状走 legacy。本 WP 只保证「谁先登记谁就能 replay 成功」。
2. **失败条目是显式丢弃**（不是保留重试）：R2/R4/R5 是永久条件，重试只会刷 `ReplayFailureCount`；
   R6 的「可重试」场景也归 `Abandon` 语义。若将来要重试，需要给条目加 `Attempts` 并把本处的
   `Drop` 换成「保留 + 上限」，不影响本次契约（`ReplayDropCount` 会把两种选择都照实计）。
3. **`Replay` 新增可选形参**，两参调用与 A1 §2.3 契约逐字兼容；`BracketRoleResolver` /
   `BracketCatalogInstaller` / 任何 `*-possible-shape` 未改。
4. 本分支基线比任务书新：克隆时主仓库 HEAD 已是 `b6bd50aa`（B1+B2 已合入）。验收读数恰为任务书
   要求的 `426/3/0/0` 与 `PASS 429`，与 B2 报告 §2.4 逐条一致。
